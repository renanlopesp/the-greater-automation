# Implementation Plan: Seasonal Calendar Skill

**Branch**: `043-seasonal-calendar-skill` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/043-seasonal-calendar-skill/spec.md`

## Summary

Build the Seasonal Calendar as the first real skill in the platform, including a reusable SkillWorkspace split-panel component (chat + artifact), a 3-level navigable calendar artifact, quick action suggestions, and database seeding. Campaign data is static/mock in this iteration; real AI generation is out of scope.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, shadcn/ui (new-york), Tailwind CSS v4, TanStack React Query, Zustand (for artifact navigation state)
**Storage**: Supabase PostgreSQL (`skills` table exists, campaign data stored as static TypeScript files)
**Testing**: Vitest + @testing-library/react
**Target Platform**: Web (desktop-first, responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Skill page loads in < 2s, artifact navigation transitions are instant (< 100ms)
**Constraints**: No new database tables needed — `skills` table already exists. Campaign data is static.
**Scale/Scope**: 1 skill, ~15 seasonal dates, 6 campaign sections per date

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                 |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | Skill page at `src/app/(dashboard)/skills/[slug]/page.tsx`, Server Component for data |
| II. shadcn/ui Component System | PASS   | Dialog, Button, Tooltip from shadcn; custom components compose primitives             |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind + CSS variables, no hex/rgb                                  |
| IV. TypeScript Strict Mode     | PASS   | All new files strictly typed                                                          |
| V. Simplicity and YAGNI        | PASS   | Static campaign data, no AI integration yet, no new DB tables                         |
| VI. Supabase as Backend        | PASS   | Skills fetched from existing `skills` table, seed via server action                   |

## Project Structure

### Documentation (this feature)

```text
specs/043-seasonal-calendar-skill/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/skills/
│   └── [slug]/
│       └── page.tsx                    # Skill detail page (existing, needs update)
├── components/
│   ├── skill-workspace/
│   │   ├── skill-workspace.tsx         # Reusable split-panel layout (NEW)
│   │   ├── skill-chat-panel.tsx        # Left panel: chat + input + suggestions (NEW)
│   │   ├── skill-artifact-panel.tsx    # Right panel: artifact content + nav (NEW)
│   │   ├── skill-hero-card.tsx         # Hero card for skill empty state (NEW)
│   │   ├── artifact-nav-context.tsx    # Navigation context for artifact levels (NEW)
│   │   └── draggable-divider.tsx       # Resizable divider between panels (NEW)
│   └── skills/
│       └── seasonal-calendar/
│           ├── calendar-artifact.tsx    # 3-level calendar artifact (NEW)
│           ├── calendar-level1.tsx      # Date list view (NEW)
│           ├── calendar-level2.tsx      # Campaign detail view (NEW)
│           ├── calendar-level3.tsx      # Section content view (NEW)
│           └── calendar-hero-card.tsx   # Calendar-specific hero card (NEW)
├── data/
│   └── campaign-data.ts                # Static campaign data (NEW)
└── lib/
    └── actions/
        └── skills.ts                   # Existing — add seedSkill action
```

**Structure Decision**: SkillWorkspace is a reusable component under `src/components/skill-workspace/`. Seasonal Calendar-specific components go under `src/components/skills/seasonal-calendar/`. Static campaign data goes in `src/data/`. This keeps the reusable workspace separate from skill-specific content.
