# Implementation Plan: Edge-Function-First Skills

**Branch**: `064-edge-function-first-skills` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/064-edge-function-first-skills/spec.md`
**Depends on**: Spec 063 (Hybrid chat API)

## Summary

Move every heavy skill generator (seasonal-calendar, copywriter, image-artifact, deliverable) out of the Next.js runtime and into dedicated Supabase Edge Functions. Next.js becomes a thin chat router + UI layer that streams conversational replies via the Messages API (Spec 063) and reads `tasks.artifact_data` via Supabase Realtime. The MCP tool `SNEW_RUN_SKILL` (already hosted in the `mcp-tools` Edge Function) becomes the dispatcher: it marks the task running and fires an HTTP call to the matching generator function with `EdgeRuntime.waitUntil`, returning a `{ status:'generating' }` ack immediately. The Spec 063 T022 short-circuit (`generateCalendarInBackground` running inside Next.js) is deleted; the in-agent `SNEW_RUN_SKILL` round-trip becomes the one true dispatch path. Net impact: ~3000+ LOC removed from `src/`, predictable Deno-only skill runtime, independent deploys per generator, and no more Vercel 504s on 60s AI jobs.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode) on Next.js side; Deno (Edge Runtime) on Supabase side
**Primary Dependencies**: `@anthropic-ai/sdk` (both runtimes), `@modelcontextprotocol/sdk` (in `mcp-tools`), `@supabase/supabase-js` (service-role), `zod`. Deno functions import via `npm:` / `https://esm.sh/` specifiers.
**Storage**: Supabase PostgreSQL — `tasks` (`artifact_type`, `artifact_data`, `skill_status`, `active_skill`, `metadata`), `brand_dna`, `stores`, `store_products`, `skills`. **No schema changes.**
**External APIs**: Anthropic Messages API, Nuvemshop Orders/Products API (called from Edge Functions, not Next.js)
**Testing**: Vitest for the Next.js router simplification (skill detector, tools-client); manual Deno smoke tests (`supabase functions serve` + curl) for each new generator; end-to-end via quickstart checklist. No new vitest harness for Deno code (Deno testing stays lightweight for v1).
**Target Platform**: Vercel Node.js runtime (Next.js), Supabase Edge Runtime (Deno, `verify_jwt=false` + `MCP_AUTH_TOKEN` guard)
**Project Type**: web (Next.js monorepo) + `supabase/functions/` sibling workspace
**Performance Goals**: seasonal-calendar end-to-end ≤ 60s (matches current production); Next.js `/api/chat` dispatch overhead for skill route ≤ 50ms (no AI work on Node anymore); `SNEW_RUN_SKILL` returns ack ≤ 300ms
**Constraints**: Supabase Edge Functions: 150s wall-clock + 400s CPU budget with `EdgeRuntime.waitUntil`; must fit current generators. Rollback per phase via env flag.
**Scale/Scope**: 4 new Edge Functions; ~8 Next.js files deleted; 1 Next.js file (`engine-agents.ts`) simplified. Migration in 3 phases (A: seasonal-calendar pilot, B: remaining skills, C: cleanup).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Compliance | Notes                                                                                                                                                                              |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | ✅         | Next.js stays App Router-only. We are REMOVING heavy compute, not adding routes. `/api/chat` remains the entrypoint.                                                               |
| II. shadcn/ui Component System | ✅         | No UI changes. Artifact renderers (`src/components/chat/artifacts/*`) untouched; they still read `tasks.artifact_data`.                                                            |
| III. Tailwind v4 + OKLCH       | ✅         | No styling changes.                                                                                                                                                                |
| IV. TypeScript Strict Mode     | ✅         | Next.js side stays strict. Edge Functions use strict TS via Deno's built-in checker; shared types re-declared in `_shared/`.                                                       |
| V. Simplicity / YAGNI          | ✅         | This spec is net-negative LOC. We are DELETING the Spec 063 T022 short-circuit, the `src/app/api/skills/*` routes, and four `src/lib/ai/*.ts` generators. One runtime per concern. |
| VI. Supabase as Backend        | ✅         | Deepens the "Supabase owns the backend" stance. All AI generation, data fetching, and writes happen server-side in Supabase Edge Functions with the service-role client.           |

**Quality gates:**

- `bun run build` passes after Next.js cleanup (dead imports removed)
- `bun run lint` clean (no unused imports from deleted modules)
- `bun run test` — existing tests for `skill-detector` / `tools-client` keep passing; add a tiny test asserting `runAgentsEngineBackground` no longer imports `generateCalendarInBackground`
- `supabase functions deploy generate-seasonal-calendar` succeeds; curl smoke check returns 202

No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/064-edge-function-first-skills/
├── plan.md              # This file
├── research.md          # Phase 0 output (dispatch, shared modules, progress, rollback)
├── data-model.md        # Phase 1 output (no schema changes; Edge Function contracts)
├── quickstart.md        # Phase 1 output (manual verification per phase)  — OUT OF SCOPE for /plan
├── contracts/           # Phase 1 output — OUT OF SCOPE for /plan (covered inline in data-model.md)
└── tasks.md             # Phase 2 output (/speckit.tasks — generated later)
```

### Source Code (repository root)

```text
supabase/
└── functions/
    ├── mcp-tools/
    │   └── index.ts                        # UPDATED: SNEW_RUN_SKILL now dispatches via HTTP
    ├── _shared/
    │   ├── anthropic.ts                    # NEW: getAnthropicClient() for Deno
    │   ├── supabase.ts                     # NEW: createServiceRoleClient() for Deno
    │   ├── auth.ts                         # NEW: checkMcpSecret(req)
    │   ├── brand-dna.ts                    # NEW: fetchBrandDna(client, teamId)
    │   ├── products.ts                     # NEW: fetchProductsForTeam(client, teamId) (Nuvemshop + DB fallback)
    │   ├── progress.ts                     # NEW: updateTaskProgress(client, taskId, steps[])
    │   └── seasonal-prompt.ts              # NEW: buildSeasonalCalendarPrompt(input) — port from src/lib/ai/seasonal-campaign-generator.ts
    ├── generate-seasonal-calendar/
    │   └── index.ts                        # NEW (Phase A): ports generateCalendarInBackground + generateCalendar
    ├── generate-copywriter/
    │   └── index.ts                        # NEW (Phase B)
    ├── generate-image-artifact/
    │   └── index.ts                        # NEW (Phase B): ports src/lib/ai/asset-generator.ts
    └── generate-deliverable/
        └── index.ts                        # NEW (Phase B): ports src/lib/ai/email-template-generator.ts

src/
├── app/api/
│   ├── chat/
│   │   └── route.ts                        # UNCHANGED contract, simpler skill branch
│   └── skills/                             # DELETED in Phase C (dead code)
│       ├── seasonal-calendar/**            # DELETE
│       └── **/generate*/route.ts           # DELETE
├── lib/
│   ├── chat/
│   │   ├── engine-messages.ts              # UNCHANGED
│   │   ├── engine-agents.ts                # SIMPLIFIED: drop generateCalendarInBackground + the skill-slug switch in runAgentsEngineBackground
│   │   ├── skill-detector.ts               # UNCHANGED
│   │   ├── tools-client.ts                 # UNCHANGED
│   │   └── save-artifact.ts                # UNCHANGED (still used for chat-path tool artifacts)
│   └── ai/
│       ├── agent-client.ts                 # UNCHANGED (chat fallback via Managed Agents)
│       ├── prompt-cache.ts                 # UNCHANGED
│       ├── platform-tools.ts               # UNCHANGED (system-prompt builder)
│       ├── seasonal-campaign-generator.ts  # DELETED (moved to supabase/functions/generate-seasonal-calendar + _shared/seasonal-prompt.ts)
│       ├── product-analyzer.ts             # DELETED (moved to _shared/products.ts + generate-seasonal-calendar)
│       ├── email-template-generator.ts     # DELETED (moved to generate-deliverable)
│       └── asset-generator.ts              # DELETED (moved to generate-image-artifact)
└── components/chat/artifacts/              # UNCHANGED (renderers read DB rows as before)
```

**Structure Decision**: Keep the existing Next.js App Router layout and add a peer `supabase/functions/_shared/` module namespace for cross-function helpers. Each generator is its own Edge Function with `verify_jwt=false` + `MCP_AUTH_TOKEN` bearer check — matching the `mcp-tools` pattern. Shared Deno code lives in `_shared/` and is imported with relative paths (`../_shared/seasonal-prompt.ts`), which Supabase's deploy bundler handles natively.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This spec removes complexity rather than adding it: one fewer runtime owns AI generation, one fewer place to search for skill logic, and the Spec 063 T022 short-circuit (an explicit deviation from 063's original intent) is undone.
