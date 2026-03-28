# Implementation Plan: Seasonal Calendar AI Integration

**Branch**: `044-seasonal-calendar-ai` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/044-seasonal-calendar-ai/spec.md`

## Summary

Add AI-powered personalized calendar and campaign generation to the Seasonal Calendar skill. The skill currently has a 3-level UI with hardcoded static data. This plan adds: (1) personalized calendar generation — AI analyzes brand DNA and products to select relevant seasonal dates per store, (2) campaign generation for each date, (3) persistence via `skill_executions`, (4) chat integration, (5) section-level regeneration, and (6) time-awareness with year boundary logic. A cleanup phase addresses technical debt first.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, Vercel AI SDK (`ai@^6.0.86`, `@ai-sdk/openai@^3.0.29`, `@ai-sdk/react@^3.0.88`), Zod 4, TanStack React Query, Zustand, shadcn/ui (new-york), Tailwind CSS v4
**Storage**: Supabase PostgreSQL — `skill_executions` table (existing), `brand_dna` table (existing), `store_products` table (existing), `skills` table (existing). No new tables or migrations.
**Testing**: Vitest + @testing-library/react (unit), Playwright (e2e)
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: Calendar generation <10s, campaign generation <20s, section regeneration <8s, saved data load <1s
**Constraints**: Brand DNA must exist before any generation. AI credits consumed per generation.
**Scale/Scope**: 10-20 personalized dates per store, ~7 sections per campaign, ~15 files modified/created

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status      | Notes                                                                           |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS        | New API routes use Route Handlers. Server Components for data loading.          |
| II. shadcn/ui Component System | PASS        | Loading states use shadcn Skeleton. Buttons use shadcn Button.                  |
| III. Tailwind CSS v4 + OKLCH   | PASS w/ FIX | Cleanup phase replaces hardcoded hex/hsl with CSS variables.                    |
| IV. TypeScript Strict Mode     | PASS w/ FIX | Cleanup phase removes `as unknown as` casts. Zod schemas for all AI output.     |
| V. Simplicity and YAGNI        | PASS        | No new tables. No abstractions beyond needed. Uses existing `skill_executions`. |
| VI. Supabase as Backend        | PASS        | Uses existing tables. RLS enabled. Server actions for data access.              |

## Project Structure

### Documentation (this feature)

```text
specs/044-seasonal-calendar-ai/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── campaign-generation.md
│   └── skill-chat.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── skills/
│           └── seasonal-calendar/
│               ├── generate-calendar/route.ts  # NEW — POST calendar generation
│               ├── generate/route.ts           # NEW — POST campaign generation
│               └── regenerate/route.ts         # NEW — POST section regeneration
├── components/
│   ├── skill-workspace/
│   │   ├── skill-workspace.tsx            # MODIFY — accept chat hook props
│   │   ├── skill-chat-panel.tsx           # MODIFY — real chat integration
│   │   ├── artifact-nav-context.tsx       # MODIFY — useCallback/useMemo fix
│   │   ├── draggable-divider.tsx          # MODIFY — remove dead code
│   │   ├── skill-artifact-panel.tsx       # MODIFY — fix double arrow
│   │   └── types.ts                       # NEW — shared types
│   └── skills/
│       └── seasonal-calendar/
│           ├── seasonal-calendar-workspace.tsx  # MODIFY — hook integration
│           ├── calendar-artifact.tsx            # MODIFY — personalized data
│           ├── calendar-hero-card.tsx           # MODIFY — real stats
│           ├── calendar-level1.tsx              # MODIFY — personalized dates + generation
│           ├── calendar-level2.tsx              # MODIFY — real campaign data
│           ├── calendar-level3.tsx              # MODIFY — real section data
│           └── shared.tsx                       # NEW — ProductThumb, StatusBadge
├── data/
│   └── campaign-data.ts                   # MODIFY — keep types only, remove static data
├── hooks/
│   ├── use-skill-chat.ts                  # NEW — wrapper over useOrchestratorChat
│   └── use-seasonal-calendar.ts           # NEW — React Query + mutations
├── lib/
│   ├── ai/
│   │   └── seasonal-campaign-generator.ts # NEW — generateCalendar + generateCampaign + Zod schemas
│   └── actions/
│       └── seasonal-calendar.ts           # NEW — server actions (load/save calendar + campaigns)
```

**Structure Decision**: Follows existing project conventions. AI logic in `src/lib/ai/`. API routes under `src/app/api/skills/seasonal-calendar/`. Three routes: one for calendar generation (new), one for campaign generation, one for section regeneration.

## Complexity Tracking

No constitution violations requiring justification.
