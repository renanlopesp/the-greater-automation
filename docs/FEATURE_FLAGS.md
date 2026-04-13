# Feature Flags

Env-var-based flags. Set in Vercel / `.env.local` / `.env.production`. Read on every request (no deploy needed to flip).

| Flag                           | Values                   | Default         | Purpose                                                                                                                                              | Owner        | Spec                                                        |
| ------------------------------ | ------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------- |
| `FEATURE_HYBRID_CHAT`          | `'true'` / anything else | off             | Route conversational chat through the Messages API engine (fast path); skills still use Managed Agents. Legacy Managed Agents path is used when off. | @renanlopesp | [063-hybrid-chat-api](../specs/063-hybrid-chat-api/spec.md) |
| `FEATURE_HYBRID_CHAT_TEAM_IDS` | comma-separated UUIDs    | `''` (disabled) | Canary rollout: enable hybrid chat only for the listed team UUIDs. Takes effect when `FEATURE_HYBRID_CHAT` is not `'true'`.                          | @renanlopesp | [063-hybrid-chat-api](../specs/063-hybrid-chat-api/spec.md) |

## Rollout guidance

- **Local dev**: set in `.env.local` during feature work.
- **Staging / Vercel preview**: enable for the first team to opt-in via `FEATURE_HYBRID_CHAT_TEAM_IDS` (see spec 063 T027).
- **Production**: flip to `true` after at least 24h of clean staging metrics (TTFT + error rate).
- **Rollback**: set to `false` (or unset) and the next request uses the legacy path. No deploy required.

## Adding a new flag

1. Document it in this table with default/purpose/owner/spec.
2. Add the `.env.example` entry.
3. Read it server-side only (avoid `NEXT_PUBLIC_` unless strictly needed).
