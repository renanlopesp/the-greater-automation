# Snew — Product Gaps Analysis

**Date:** 2026-04-07
**Branch:** 055-chat-dynamic-artifacts
**Scope:** Full-stack analysis (Frontend, Backend/API, Architecture)

---

## Summary

| Severity  | Frontend | Backend | Architecture | Total  |
| --------- | -------- | ------- | ------------ | ------ |
| Critical  | 4        | 4       | 3            | **11** |
| High      | 7        | 6       | 5            | **18** |
| Medium    | 12       | 10      | 6            | **28** |
| Low       | 7        | 2       | 4            | **13** |
| **Total** | **30**   | **22**  | **18**       | **70** |

---

## 1. FRONTEND / UI GAPS

### Critical

| #   | Gap                          | Description                                                                                                            |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| F1  | No error boundaries          | Zero `error.tsx` files exist anywhere under `src/app/`. Runtime errors crash the entire app with no recovery UI.       |
| F2  | Dashboard data is hardcoded  | `activity-cards.tsx` has hardcoded strings ("Campanha de Páscoa publicada em 3 canais"). Not fetched from any API.     |
| F3  | Settings button disconnected | The Settings button in sidebar (`app-sidebar-new.tsx`) has no `onClick`. On `/chat` routes, settings are inaccessible. |
| F4  | No message editing           | Users cannot edit a previous message. `MessageBranch` component exists in ai-elements but is never used.               |

### High

| #   | Gap                                 | Description                                                                                               |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| F5  | Regenerate button is non-functional | "Regenerar" button has no `onClick` handler — purely decorative.                                          |
| F6  | No retry on error                   | Chat errors show a static red banner with no "Try again" button.                                          |
| F7  | Sidebar credits hardcoded           | `847 credits remaining` is a hardcoded string, not from billing API.                                      |
| F8  | No real metrics on dashboard        | No revenue, orders, conversion rate — just hardcoded activity cards.                                      |
| F9  | Mobile chat layout broken           | Split layout requires 700px+ minimum. No responsive breakpoint.                                           |
| F10 | Only 2 artifact types               | `artifact-renderer.tsx` handles only `seasonal-calendar` and `chat-data`. Everything else dumps raw JSON. |
| F11 | Minimal accessibility               | No `aria-live` on message list, no keyboard nav on custom dropdowns, no focus management.                 |

### Medium

| #   | Gap                                         | Description                                                                        |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| F12 | Share/Download buttons non-functional       | No onClick handlers.                                                               |
| F13 | Thumbs Up/Down non-functional               | Feedback buttons collect nothing.                                                  |
| F14 | No conversation search                      | No full-text search across message content.                                        |
| F15 | No copy feedback                            | Copy button has no toast/checkmark confirmation.                                   |
| F16 | No tool progress indicators                 | During tool calls, user only sees bouncing dots. Tool component exists but unused. |
| F17 | No artifact toggle                          | Artifact panel always visible with daily summary. No way to collapse.              |
| F18 | Mixed language in UI                        | Inconsistent Portuguese/English mix across components.                             |
| F19 | No conversation sidebar                     | No list of recent conversations (unlike ChatGPT sidebar).                          |
| F20 | No onboarding/first-run experience          | New users get hardcoded cards and an ask bar. No guided setup.                     |
| F21 | No password change / 2FA / account deletion | Account section only allows name + avatar.                                         |
| F22 | No artifact export                          | No way to export HTML artifact as PDF, image, or share link.                       |
| F23 | No message timestamps                       | Messages show no time information.                                                 |

### Low

| #   | Gap                               | Description                                                                               |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| F24 | Textarea does not auto-resize     | Fixed `rows={2}` with no scroll-height adjustment.                                        |
| F25 | Model menu uses custom dropdown   | No keyboard nav, focus trapping, or click-outside-to-close. Should use Radix.             |
| F26 | No breadcrumbs outside workspace  | Chat, skills, task detail pages have no breadcrumb nav.                                   |
| F27 | Inline styles mixed with Tailwind | `activity-cards.tsx` uses entirely inline styles.                                         |
| F28 | Iframe sandbox restrictions       | `sandbox="allow-scripts"` blocks forms. May need `allow-forms` for interactive artifacts. |
| F29 | No page transition animations     | Instant page changes, no View Transitions.                                                |
| F30 | No global dark mode toggle        | Theme toggle only exists inside artifact iframe, not in main app shell.                   |

---

## 2. BACKEND / API GAPS

### Critical

| #   | Gap                                                                | Description                                                                                                                                                               |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | No usage limit check before AI calls                               | `checkUsageLimits(teamId)` exists in `usage-check.ts` but is NEVER called by the chat route. A user can drain unlimited credits.                                          |
| B2  | No rate limiting on chat endpoint                                  | No per-user rate limiting on `/api/chat`. A single user can flood the AI API.                                                                                             |
| B3  | `conversations` / `conversation_messages` tables likely unmigrated | No migration creates these tables. Chat route writes via service role, bypassing RLS.                                                                                     |
| B4  | No model-aware cost tracking                                       | `tokensToCredits()` uses flat rate (1 credit = 1,000 tokens) regardless of model. Claude Opus 4.6 costs ~15x more per token than GPT-4o. Business absorbs the difference. |

### High

| #   | Gap                                         | Description                                                                                                                                                                                           |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B5  | No AI provider fallback                     | If GPT-5.2 fails (outage, rate limit), no fallback to Claude. Error propagates as generic 500.                                                                                                        |
| B6  | Hardcoded skill registry (only 3 skills)    | `skill-registry.ts` has only `general`, `seasonal-calendar`, `copywriter`. DB has many more but runtime doesn't load them.                                                                            |
| B7  | Skill executor is "Fase 0" only             | `skill-executor.ts` only loads context, doesn't execute skill logic. Only `seasonal-calendar` has real execution.                                                                                     |
| B8  | No OAuth token refresh/expiration detection | When Composio connection expires, system only discovers on tool failure. No proactive refresh.                                                                                                        |
| B9  | ~~No middleware-based route protection~~    | **FALSE POSITIVE** — `proxy.ts` (Next.js 16 middleware) handles centralized auth, protecting pages + APIs. Individual routes still call `getUser()` for user context, but auth gating is centralized. |
| B10 | No real-time product sync                   | Product data can be up to 15 minutes stale (cron-based only).                                                                                                                                         |

### Medium

| #   | Gap                                            | Description                                                                                                |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| B11 | Hardcoded step count limit (10)                | AI can execute max 10 tool calls per message. Complex tasks silently stop.                                 |
| B12 | OAuth callback uses cookies for state          | If browser blocks third-party cookies or user takes >10 min, callback fails. Should use server-side state. |
| B13 | No webhook for connection status changes       | Composio connection deauthorization isn't detected until tool execution fails.                             |
| B14 | Cron routes use shared secret without rotation | Inconsistent validation (`===` vs `Bearer` prefix). No IP filtering.                                       |
| B15 | Tasks table RLS allows cross-user visibility   | Any team member can read other members' chat conversations. No user-level privacy.                         |
| B16 | No DELETE policy on tasks table                | Deletion uses service role to bypass RLS instead of proper policy.                                         |
| B17 | No conversation-to-task FK cleanup             | Orphaned conversations accumulate with no cleanup mechanism.                                               |
| B18 | No artifact data size limit                    | JSONB column has no size constraint. Large campaigns could grow to tens of MB.                             |
| B19 | Calendar fetches only 200 products max         | Stores with larger catalogs have incomplete data. No pagination.                                           |
| B20 | No sync error tracking or retry                | Failed product syncs have no backoff, error count, or user notification.                                   |

### Low

| #   | Gap                                           | Description                                                                       |
| --- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| B21 | Legacy AI step uses Kiro Chat API             | `src/lib/ai/chat.ts` still uses Kiro API. If deprecated, workflow AI steps break. |
| B22 | Duplicate `createServiceRoleClient` functions | Two files export identical factories. Inconsistent imports across codebase.       |

---

## 3. ARCHITECTURE / INFRASTRUCTURE GAPS

### Critical

| #   | Gap                               | Description                                                                                                    |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A1  | Zero test coverage                | No test runner configured. `vitest.config.ts` exists but has errors. `bun run test` fails. Zero passing tests. |
| A2  | No error monitoring (Sentry/etc.) | No `@sentry/nextjs`, no error reporting service. Production errors are invisible.                              |
| A3  | No CI/CD pipeline                 | No `.github/workflows/` directory. No automated testing, linting, or deployment checks on PRs.                 |

### High

| #   | Gap                                             | Description                                                                                           |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A4  | Platform access tokens stored in plaintext      | `stores.platform_access_token` is plaintext in DB. Service-role queries and backups expose tokens.    |
| A5  | No message length validation                    | No max message size enforced at API boundary. Users can send arbitrarily large messages.              |
| A6  | Artifact iframe XSS vector                      | `sandbox="allow-scripts"` on AI-generated HTML. AI could be prompt-injected to generate malicious JS. |
| A7  | 270+ dependencies                               | `package.json` has large dependency tree. No bundle analysis or tree-shaking audit.                   |
| A8  | CLAUDE.md has stale Active Technologies section | Lists 20+ feature branches with outdated tech stacks. Should be pruned to current state only.         |

### Medium

| #   | Gap                                       | Description                                                                                      |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A9  | No environment management                 | Single `.env.local` file. No staging environment, no env validation (e.g., `t3-oss/env-nextjs`). |
| A10 | No database backup strategy               | Relying on Supabase's default backups. No point-in-time recovery testing documented.             |
| A11 | Composio SDK singleton may leak           | `_instance` in `client.ts` persists across hot reloads in dev. Could hold stale API keys.        |
| A12 | No API response typing                    | Chat route uses 29+ `as never` / `as unknown` type casts due to unmigrated tables.               |
| A13 | Pre-commit hook only runs lint-staged     | No type-checking (`tsc --noEmit`) in pre-commit or pre-push. TS errors reach main.               |
| A14 | Mixed logging — pino logger + console.log | `createLogger` used in some files, raw `console.log` in others. No structured logging standard.  |

### Low

| #   | Gap                       | Description                                                                      |
| --- | ------------------------- | -------------------------------------------------------------------------------- |
| A15 | No bundle size tracking   | No `@next/bundle-analyzer` or similar. No visibility into client-side JS weight. |
| A16 | Unused specs accumulate   | `specs/` directory has 50+ feature specs, many outdated. No cleanup process.     |
| A17 | No API documentation      | No OpenAPI/Swagger for the REST endpoints.                                       |
| A18 | No performance monitoring | No Web Vitals tracking, no server-side APM.                                      |

---

## Top 10 Priority Fixes

1. **[B1] Add usage limit check to chat route** — One-line fix, prevents unlimited cost exposure
2. **[A1] Set up Vitest and add basic smoke tests** — Foundation for all other quality improvements
3. **[A2] Add Sentry error monitoring** — Production errors are currently invisible
4. **[B2] Add rate limiting to `/api/chat`** — Prevents API cost abuse
5. **[B4] Implement model-aware credit costs** — Claude Opus costs 15x more than GPT-4o per token
6. **[F1] Add `error.tsx` at dashboard layout level** — Zero effort, prevents full-app crashes
7. **[F2] Replace hardcoded dashboard data** — Dashboard currently misleads users with fake activity
8. **[F5/F6] Wire regenerate button + add retry** — Users see buttons that don't work
9. **[B9] Add Next.js middleware for centralized auth** — 46 routes independently checking auth
10. **[A3] Add GitHub Actions CI** — Automated lint + typecheck + test on PRs

---

---

## 4. SECURITY GAPS (Detail from Architecture Analysis)

| #   | Severity | Gap                               | Description                                                                                                                                                                                               |
| --- | -------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Critical | innerHTML XSS in main document    | `seasonal-calendar-artifact.tsx:809,927` injects AI-generated HTML via `innerHTML`/`dangerouslySetInnerHTML` in the **main document** (not iframe). AI could be prompt-injected to generate malicious JS. |
| S2  | High     | No Content-Security-Policy header | `proxy.ts` sets X-Frame-Options etc. but no CSP. Inline scripts and arbitrary resource loading unrestricted.                                                                                              |
| S3  | High     | Cron secret timing attack         | All 6 cron routes use `!==` for secret comparison instead of `crypto.timingSafeEqual`. Vulnerable to timing attacks.                                                                                      |
| S4  | Medium   | No CSRF protection                | No CSRF tokens. Relies on SameSite=Lax cookies only.                                                                                                                                                      |
| S5  | Medium   | 184 type safety suppressions      | `as any`, `as never`, `@ts-ignore` across 50 files. Worst: `chat/route.ts` with 22 suppressions.                                                                                                          |

## 5. PERFORMANCE GAPS

| #   | Severity | Gap                                        | Description                                                                                  |
| --- | -------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| P1  | Medium   | Chat route queries DB 7+ times per message | Team context, skills, store, brand DNA re-fetched on every message. No caching layer.        |
| P2  | Medium   | Duplicate animation library                | Both `framer-motion` AND `motion` installed (same library, different name). ~50-80KB wasted. |
| P3  | Low      | Large god-files                            | `platform-tools.ts` = 1,849 lines, `agent-chat.ts` = 874 lines, `chat/route.ts` = 561 lines. |

---

## Notes

- This analysis covers the codebase as of branch `055-chat-dynamic-artifacts`
- Gaps are classified by impact on user experience, security, and business risk
- "Critical" = blocks core functionality or creates security/financial risk
- "High" = degrades UX significantly or creates technical debt that compounds
- "Medium" = missing polish, incomplete features, or suboptimal patterns
- "Low" = nice-to-have improvements, consistency fixes
