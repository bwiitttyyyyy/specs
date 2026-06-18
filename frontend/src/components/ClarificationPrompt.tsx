import { useState } from "react";
import { Button } from "./ui/primitives";
import type { SessionHandle } from "../services/ws";
import { useSessionStore } from "../state/connection";

/** Answer a clarifying question raised by a running command (T044, FR-014). */
export function ClarificationPrompt({ session }: { session: SessionHandle }) {
  const clarification = useSessionStore((s) => s.clarification);
  const [text, setText] = useState("");
  if (!clarification) return null;

  const submit = (answer: string): void => {
    session.answer(clarification.interactionId, answer);
    setText("");
  };

  return (
    <div
      className="rounded-md border border-amber-300 bg-amber-50 p-3"
      role="dialog"
      aria-label="Clarification needed"
    >
      <p className="text-sm font-medium text-amber-900">⏳ Waiting on you</p>
      <p className="mt-1 text-sm text-amber-900">{clarification.question}</p>
      {clarification.options && clarification.options.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {clarification.options.map((opt) => (
            <Button key={opt} onClick={() => submit(opt)}>
              {opt}
            </Button>
          ))}
        </div>
      ) : (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) submit(text.trim());
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Your answer"
            className="flex-1 rounded-md border border-line px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <Button type="submit">Send</Button>
        </form>
      )}
    </div>
  );
}
