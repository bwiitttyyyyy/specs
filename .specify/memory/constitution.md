<!--
Sync Impact Report
===================
Version change: (unratified template) → 1.0.0
Rationale: First concrete ratification of the project constitution. MAJOR (initial 1.0.0)
because all principles are newly defined and binding.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. UX Excellence (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Component-Driven React Frontend
  - [PRINCIPLE_3_NAME] → III. Resilient Remote-Session Integration
  - [PRINCIPLE_4_NAME] → IV. Quality Gates & Test Discipline
  - [PRINCIPLE_5_NAME] → V. Simplicity & Scoped Surface (YAGNI)

Added sections:
  - Technology & Architecture Constraints (was [SECTION_2_NAME])
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])

Removed sections: none

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check derives gates dynamically; no edit needed
  - ✅ .specify/templates/spec-template.md — no new mandatory spec sections introduced; no edit needed
  - ✅ .specify/templates/tasks-template.md — principle-driven task types (UX, integration resilience,
       testing) already expressible; no edit needed

Follow-up TODOs: none. RATIFICATION_DATE set to first adoption date (2026-06-17).
-->

# Speckit Web Dashboard Constitution

## Core Principles

### I. UX Excellence (NON-NEGOTIABLE)

The dashboard MUST deliver a slick, polished, well-designed user experience. This is the
product's primary differentiator, not a finishing touch.

- Every interactive surface MUST provide immediate, legible feedback: loading, streaming,
  idle, working, waiting-for-input, error, and success states are always visible and
  unambiguous.
- The interface MUST be responsive on desktop browsers, keyboard-navigable, and meet
  WCAG 2.1 AA for color contrast, focus order, and screen-reader labels.
- Reading specs MUST be visually superior to reading raw markdown in an editor: clear
  typography, navigable structure, and no raw-file clutter.
- Perceived latency matters: streamed output MUST begin rendering within 2 seconds of a
  user action, and no action may leave the UI appearing frozen.

**Rationale**: The feature exists to make specs more readable and iterable. A clumsy or
slow UI defeats the entire purpose, so UX quality is treated as a correctness requirement.

### II. Component-Driven React Frontend

The frontend MUST be built in React with a component-driven architecture.

- TypeScript MUST be used; `any` is prohibited except at explicitly justified boundaries.
- UI MUST be composed from small, reusable, single-responsibility components; shared
  behavior MUST be extracted rather than copy-pasted.
- Component state and server/session state MUST be clearly separated; side effects are
  isolated and never hidden inside render logic.
- A design-system approach (shared tokens for color, spacing, typography; reused primitives)
  MUST be followed so the "slick" look stays consistent as the app grows.

**Rationale**: A consistent React component model is what makes Principle I sustainable and
keeps a UI-heavy product maintainable.

### III. Resilient Remote-Session Integration

Interaction with the remote Claude session MUST be treated as an unreliable, asynchronous
boundary and engineered to fail gracefully.

- Connection status (connected, working, awaiting input, disconnected) MUST always be
  derivable and surfaced to the user.
- A dropped or failing session MUST NEVER lose the user's open spec view or unsaved work;
  partial streamed output MUST be preserved and recovery (retry/reconnect) MUST be possible.
- Concurrent changes (session edits vs. manual edits) MUST surface conflicts instead of
  silently overwriting either side.
- Destructive actions MUST require explicit confirmation.

**Rationale**: The dashboard's value depends entirely on a remote session it does not
control; robustness at this boundary is non-negotiable for user trust.

### IV. Quality Gates & Test Discipline

Functionality MUST be protected by automated tests appropriate to its risk.

- Core logic — session state handling, conflict detection, lifecycle-status derivation,
  streaming parsing — MUST have unit tests.
- Primary user journeys (browse/read a spec, run a command, chat-iterate, edit-and-save)
  MUST have integration or end-to-end coverage.
- New behavior SHOULD be accompanied by its tests in the same change; bug fixes MUST add a
  regression test.
- CI MUST pass (build, type-check, lint, tests) before merge; a red gate blocks merge.

**Rationale**: A real-time, conflict-prone integration is easy to break invisibly; tests on
the risky parts keep iteration fast and safe.

### V. Simplicity & Scoped Surface (YAGNI)

Build the simplest thing that satisfies the spec; defer everything else.

- The initial product targets a single authorized user and desktop web; multi-user roles,
  collaboration, and mobile optimization are explicitly out of scope until specified.
- New dependencies, abstractions, or configuration MUST be justified against a concrete,
  present need — not a hypothetical future one.
- Scope expansions MUST be reflected in a spec before implementation, not smuggled in.

**Rationale**: A focused surface keeps the UX polished and the integration resilient;
unscoped growth is the fastest way to erode both.

## Technology & Architecture Constraints

- **Frontend**: React + TypeScript. UI composed from reusable components backed by a shared
  design system / token set.
- **Remote integration**: The dashboard connects to an externally provisioned remote Claude
  session over a live, streaming-capable connection; provisioning and authentication of that
  session are dependencies handled outside this codebase.
- **Specs source of truth**: The project's standard speckit layout (e.g., a `specs/`
  directory with per-feature artifacts) is authoritative; the dashboard reads and writes
  those files rather than maintaining a divergent copy.
- **Access**: The dashboard and its connected sessions MUST be restricted to the authorized
  user.
- **Scope-driven choices**: Storage, hosting, and backend choices SHOULD remain as light as
  the single-user, multi-project scope allows; heavier infrastructure requires justification
  under Principle V.

## Development Workflow & Quality Gates

- **Spec-first**: Features follow the speckit flow — specify → (clarify) → plan → tasks →
  implement. Implementation MUST trace back to an approved spec.
- **Constitution Check**: `/speckit-plan` MUST verify the plan against these principles
  before design and again after design; violations MUST be recorded in the plan's Complexity
  Tracking with justification or the plan MUST be revised.
- **Review**: Every change MUST be reviewed for compliance with Principles I–V, with explicit
  attention to UX state coverage (I) and session-failure handling (III).
- **Green gate**: build, type-check, lint, and tests MUST pass before merge.

## Governance

This constitution supersedes other practices for the Speckit Web Dashboard. When guidance
conflicts, the constitution wins.

- **Amendments**: Proposed via a change that updates this file, states the rationale, and
  includes a Sync Impact Report. Amendments take effect once merged.
- **Versioning policy** (semantic): MAJOR for backward-incompatible governance or
  principle removals/redefinitions; MINOR for a new principle/section or materially expanded
  guidance; PATCH for clarifications and non-semantic refinements.
- **Compliance review**: Plans and reviews MUST verify compliance; any deviation MUST be
  justified in writing (plan Complexity Tracking) or corrected. Unjustified complexity is
  grounds to reject a change.

**Version**: 1.0.0 | **Ratified**: 2026-06-17 | **Last Amended**: 2026-06-17
