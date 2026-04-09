# Research: Chat Engine Replacement

**Date**: 2026-04-09

## Decision 1: Reuse vs Rewrite the 057 Implementation

**Decision**: Harden the existing 057 implementation rather than rewriting from scratch.

**Rationale**: The 057 chat route already implements 90% of the flow correctly — auth, message parsing, session creation/resumption, event streaming, SSE translation, message persistence, and credit deduction. Rewriting would be wasteful. What's needed is adding missing pieces (credit check, error recovery) and removing the inline provisioning helper.

**Alternatives considered**:

- Full rewrite: Wastes working code, high risk of regressions.
- Keep as-is: Missing credit checks and error recovery makes it production-unsafe.

## Decision 2: Session Error Recovery Strategy

**Decision**: On session errors (expired, terminated), create a new session and retry the message once.

**Rationale**: Sessions can expire if idle too long. Creating a new session is cheap (~100ms). Retrying once covers the common case without infinite loops.

**Alternatives considered**:

- Return error to user: Bad UX — user has to re-send their message.
- Keep sessions alive with heartbeats: Over-engineered for the expected usage pattern.

## Decision 3: Inline provisionAgent() Removal

**Decision**: Remove the inline `provisionAgent()` helper from the chat route. Instead, call the existing `/api/agents/provision` endpoint internally (fetch to self) or extract the provisioning logic to a shared module.

**Rationale**: The provisioning logic is duplicated — once in the chat route helper and once in the provision route. Sharing the logic eliminates duplication and ensures both paths use the same two-mode prompt logic.

**Alternatives considered**:

- Keep inline helper: Duplication, divergence risk.
- Always require pre-provisioning: Bad UX — user would get errors on first message.

## Decision 4: File Attachment Handling

**Decision**: Extract file URLs from the message parts and append them to the text content sent to the agent. The agent receives public Supabase Storage URLs it can use with any external API.

**Rationale**: The current implementation already handles file uploads to Supabase Storage. The agent needs the public URLs in the message text to use them (e.g., post to Instagram). The frontend already handles file upload and sends file parts.

**Alternatives considered**:

- Send files as binary content: Managed Agents API doesn't support binary in events.
- Upload to agent's environment: Adds complexity, unnecessary when public URLs work.
