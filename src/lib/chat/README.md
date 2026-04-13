# lib/chat

Chat engines for the Snew orchestrator. Spec: [063-hybrid-chat-api](../../../specs/063-hybrid-chat-api/spec.md).

## Two engines, one router

- **`engine-messages.ts`** — Anthropic Messages API direct, with inline tools and ephemeral prompt caching. Used for conversational chat and retail tool queries. Fast (~2s first-token).
- **`engine-agents.ts`** — Anthropic Managed Agents proxy. Used for long-running skill runs (seasonal-calendar, copywriter, etc.) and as the fallback when `FEATURE_HYBRID_CHAT` is off.

The route handler at `src/app/api/chat/route.ts` calls `detectMode(body, teamSkills)` to pick the engine, then delegates. See the spec for rationale.
