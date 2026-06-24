import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative, dirname } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { InteractionKind } from "@speckit-dashboard/shared";
import type { EmitFn, SessionAdapter } from "./adapter.js";

const SYSTEM_PROMPT = `You are a speckit assistant that manages software specifications.

You have tools to read/write files in the project's specs directory, list directories, and ask the user clarifying questions when needed.

Speckit commands you may be asked to run:
- /speckit-specify: Draft a new spec from a feature description
- /speckit-clarify: Ask questions to clarify and refine an existing spec
- /speckit-plan: Generate an implementation plan for a spec
- /speckit-tasks: Break a plan into concrete implementation tasks
- /speckit-implement: Begin implementing tasks from the task list
- /speckit-review: Review changes against the spec

Always read relevant files before making changes. Save produced artifacts with write_file. Use ask_clarification when you need input before proceeding.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file in the specs directory",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to the specs directory" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file in the specs directory",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to the specs directory" },
        content: { type: "string", description: "File content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List entries in a directory within the specs directory",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to the specs directory; use '.' for root",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "ask_clarification",
    description: "Ask the user a clarifying question and wait for their answer before continuing",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string" },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of suggested answers",
        },
      },
      required: ["question"],
    },
  },
];

/**
 * Drives a real Claude session locally via the Anthropic Messages API.
 *
 * One adapter per project; the conversation history persists across interactions
 * so Claude retains context within a session. Tools give Claude read/write access
 * to the project's specs directory; ask_clarification pauses the loop until the
 * user replies (FR-014).
 */
export class ClaudeSessionAdapter implements SessionAdapter {
  private client: Anthropic | null = null;
  private readonly history: Anthropic.MessageParam[] = [];
  private readonly pendingAnswers = new Map<string, (answer: string) => void>();
  private readonly activeControllers = new Map<string, AbortController>();

  constructor(
    private readonly specsPath: string,
    _sessionTarget: string,
  ) {}

  async connect(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Set it in the environment to enable the Claude session adapter.",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  disconnect(): void {
    for (const [, controller] of this.activeControllers) {
      controller.abort();
    }
    this.activeControllers.clear();
    this.pendingAnswers.clear();
    this.client = null;
  }

  run(interactionId: string, kind: InteractionKind, input: string, emit: EmitFn): void {
    const controller = new AbortController();
    this.activeControllers.set(interactionId, controller);
    void this.runAsync(interactionId, kind, input, emit, controller.signal).finally(() => {
      this.activeControllers.delete(interactionId);
    });
  }

  answer(interactionId: string, answer: string): void {
    const resolver = this.pendingAnswers.get(interactionId);
    if (resolver) {
      this.pendingAnswers.delete(interactionId);
      resolver(answer);
    }
  }

  cancel(interactionId: string): void {
    this.activeControllers.get(interactionId)?.abort();
  }

  private async runAsync(
    interactionId: string,
    kind: InteractionKind,
    input: string,
    emit: EmitFn,
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.client) {
      emit({ kind: "end", interactionId, status: "failed" });
      return;
    }
    const userContent = kind === "command" ? `Run speckit command: ${input}` : input;
    this.history.push({ role: "user", content: userContent });
    try {
      await this.agentLoop(interactionId, emit, signal);
      emit({ kind: "end", interactionId, status: "completed" });
    } catch {
      emit({ kind: "end", interactionId, status: signal.aborted ? "cancelled" : "failed" });
    }
  }

  private async agentLoop(
    interactionId: string,
    emit: EmitFn,
    signal: AbortSignal,
  ): Promise<void> {
    while (true) {
      if (signal.aborted) throw new Error("aborted");

      const stream = this.client!.messages.stream(
        {
          model: "claude-opus-4-8",
          system: `${SYSTEM_PROMPT}\n\nSpecs directory: ${this.specsPath}`,
          messages: this.history,
          tools: TOOLS,
          max_tokens: 8096,
        },
        { signal },
      );

      stream.on("text", (text) => {
        emit({ kind: "output", interactionId, chunk: text });
      });

      const message = await stream.finalMessage();
      this.history.push({
        role: "assistant",
        content: message.content as Anthropic.ContentBlockParam[],
      });

      if (message.stop_reason !== "tool_use") break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of message.content) {
        if (block.type !== "tool_use") continue;
        if (signal.aborted) throw new Error("aborted");
        const result = await this.executeTool(
          block.name,
          block.input,
          interactionId,
          emit,
          signal,
        );
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }

      if (signal.aborted) throw new Error("aborted");
      this.history.push({ role: "user", content: toolResults });
    }
  }

  private safePath(rel: string): string {
    const abs = resolve(this.specsPath, rel);
    if (relative(this.specsPath, abs).startsWith("..")) {
      throw new Error("path is outside the specs directory");
    }
    return abs;
  }

  private async executeTool(
    name: string,
    input: unknown,
    interactionId: string,
    emit: EmitFn,
    signal: AbortSignal,
  ): Promise<string> {
    const args = input as Record<string, unknown>;

    if (name === "ask_clarification") {
      const question = String(args.question ?? "");
      const options = Array.isArray(args.options) ? (args.options as string[]) : undefined;
      emit({ kind: "clarification", interactionId, question, options });
      return new Promise<string>((resolve, reject) => {
        this.pendingAnswers.set(interactionId, resolve);
        signal.addEventListener(
          "abort",
          () => {
            this.pendingAnswers.delete(interactionId);
            reject(new Error("aborted"));
          },
          { once: true },
        );
      });
    }

    try {
      if (name === "read_file") {
        return readFileSync(this.safePath(String(args.path ?? "")), "utf8");
      }
      if (name === "write_file") {
        const dest = this.safePath(String(args.path ?? ""));
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, String(args.content ?? ""), "utf8");
        return "ok";
      }
      if (name === "list_directory") {
        const dir = this.safePath(String(args.path ?? "."));
        return readdirSync(dir)
          .map((e) => (statSync(join(dir, e)).isDirectory() ? `${e}/` : e))
          .join("\n");
      }
    } catch (e) {
      return `Error: ${(e as Error).message}`;
    }

    return `Unknown tool: ${name}`;
  }
}
