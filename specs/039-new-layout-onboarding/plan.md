# Implementation Plan: New Layout + Onboarding Flow

**Branch**: `039-new-layout-onboarding` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-new-layout-onboarding/spec.md`

## Summary

Replace the current dashboard layout with a new design based on the snew-ai-core prototype: icon-only sidebar, topbar, chat-first home, redesigned skills pages with PT-BR categories, rich skill detail, onboarding flow (4 steps including Brand DNA), and apps page. This is primarily a UI feature — most data already exists from `038-single-agent-skills`.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, shadcn/ui (new-york), Tailwind CSS v4, TanStack React Query, Zustand, lucide-react
**Storage**: Supabase PostgreSQL (existing skills + skill_executions tables from 038)
**Testing**: `bun run build` + `bun run lint`
**Target Platform**: Web (responsive: 375px–2560px)
**Project Type**: Web application (fullstack Next.js)
**Performance Goals**: Home page loads in < 2s. All pages render without layout shift.
**Constraints**: Must match prototype visually. Must preserve existing chat functionality. Must be responsive.
**Scale/Scope**: ~40 components, ~15 pages, 4 migrations, ~30 files modified.

## Constitution Check

| Principle                      | Status | Notes                                                                                         |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | All pages use App Router. Onboarding uses separate route group. Server Components by default. |
| II. shadcn/ui Component System | PASS   | All UI from shadcn primitives (Card, Badge, Button, Tabs, Switch, Dialog).                    |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind. Colors via CSS variables.                                           |
| IV. TypeScript Strict Mode     | PASS   | All new code in strict TypeScript.                                                            |
| V. Simplicity and YAGNI        | PASS   | Brand DNA is visual-only (mock data). No premature real-data integration.                     |
| VI. Supabase as Backend        | PASS   | Reads from existing skills table. New brand_dna table with RLS.                               |

## Project Structure

### Documentation

```text
specs/039-new-layout-onboarding/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # REWRITE — new sidebar + topbar layout
│   │   ├── page.tsx                # REWRITE — new home (ask bar + activity + skills)
│   │   ├── skills/
│   │   │   ├── page.tsx            # REWRITE — redesigned skills library
│   │   │   └── [slug]/page.tsx     # REWRITE — rich skill detail
│   │   ├── apps/page.tsx           # NEW — apps catalog page
│   │   └── history/page.tsx        # KEEP (minor updates)
│   └── (onboarding)/
│       └── onboarding/
│           ├── layout.tsx          # NEW — fullscreen layout (no sidebar)
│           ├── page.tsx            # NEW — welcome
│           ├── connect/page.tsx    # NEW — platform selection
│           ├── analyzing/page.tsx  # NEW — analysis progress
│           └── brand-dna/page.tsx  # NEW — Brand DNA results
├── components/
│   ├── layout/
│   │   ├── app-sidebar-new.tsx     # NEW — icon sidebar
│   │   ├── top-bar.tsx             # NEW — topbar
│   │   └── sidebar-skill-pills.tsx # NEW — active skills in sidebar footer
│   ├── home/
│   │   ├── ask-bar.tsx             # NEW — centered ask input
│   │   ├── activity-feed.tsx       # NEW — activity items list
│   │   └── active-skills-row.tsx   # NEW — skill pills with time
│   ├── skills/
│   │   ├── skill-card-new.tsx      # REWRITE — emoji icon card
│   │   ├── skill-library-new.tsx   # REWRITE — with PT-BR sidebar
│   │   ├── skill-detail-new.tsx    # REWRITE — rich detail page
│   │   ├── skill-filter-sidebar.tsx# NEW — category sidebar with tabs
│   │   └── skill-config-panel.tsx  # NEW — configuration section
│   ├── apps/
│   │   ├── app-card.tsx            # NEW — app connection card
│   │   └── apps-grid.tsx           # NEW — apps list with search
│   ├── onboarding/
│   │   ├── welcome-screen.tsx      # NEW
│   │   ├── connect-screen.tsx      # NEW
│   │   ├── analyzing-screen.tsx    # NEW
│   │   └── brand-dna-screen.tsx    # NEW — conversational Brand DNA
│   └── brand-dna/
│       ├── brand-identity-card.tsx  # NEW
│       ├── tone-of-voice-card.tsx   # NEW (usar/evitar tags)
│       ├── diagnostic-list.tsx      # NEW (strengths + alerts)
│       ├── opportunities-list.tsx   # NEW (colored border cards)
│       ├── revenue-projection.tsx   # NEW
│       └── skill-activation-list.tsx# NEW (toggles)
├── data/
│   ├── skills.ts                   # MODIFY — add emoji, expand categories, 7 new skills
│   ├── apps.ts                     # NEW — 13 app definitions
│   └── mock-brand-dna.ts           # NEW — mock data for onboarding
├── hooks/
│   ├── use-active-skills-sidebar.ts # NEW
│   └── use-activity-feed.ts         # NEW
└── lib/
    ├── queries/skills.ts            # MODIFY — add fetchActiveSkillsForSidebar
    └── actions/
        ├── skills.ts                # MODIFY — add updateSkillConfig
        └── onboarding.ts            # NEW — completeOnboarding

supabase/migrations/
├── YYYYMMDD_alter_skills_add_detail_columns.sql
├── YYYYMMDD_alter_skills_expand_categories.sql
├── YYYYMMDD_create_brand_dna_table.sql
└── YYYYMMDD_update_skills_with_detail_data.sql
```

**Structure Decision**: New layout components go in `src/components/layout/` (new dir). Onboarding pages use a separate route group `(onboarding)` for fullscreen layout. Existing components in `src/components/skills/` from 038 are replaced with `-new` variants during development, then renamed after verification. Brand DNA components get their own dir since they're reused in both onboarding and a future standalone page.

## Design Decisions

### D1: Replace Layout, Don't Extend

Current sidebar is text-expanded, agent-focused. New sidebar is icon-only, skill-focused. Complete replacement is cleaner. See [research.md](./research.md#r1).

### D2: Separate Route Group for Onboarding

`(onboarding)` route group with minimal layout (no sidebar/topbar). Clean separation from dashboard layout. See [research.md](./research.md#r3).

### D3: PT-BR Categories as Display Labels

DB keeps English slugs. PT-BR labels in code. No DB change needed for labels. See [research.md](./research.md#r4).

### D4: Brand DNA Visual-Only (Mock Data)

Onboarding Brand DNA shows pre-built content with mock data. Real integration (scraping, analysis) is Fase 1 CMO scope. See [research.md](./research.md#r6).

### D5: Activity Feed — Mixed Sources

Home activity combines real skill execution data with mock actionable items. Full implementation comes with Fase 1 skills. See [research.md](./research.md#r7).

## Implementation Phases

### Phase 1: Database + Data Layer

1. Migration: add detail columns to skills (emoji, stats, what_it_does, etc.)
2. Migration: expand category constraint (add 'cart', 'social')
3. Migration: create brand_dna table
4. Migration: populate skills with detail data from prototype
5. Update `src/data/skills.ts` — add emoji, PT-BR labels, 7 new skills, expanded categories
6. Create `src/data/apps.ts` — 13 app definitions
7. Create `src/data/mock-brand-dna.ts` — mock data for onboarding

### Phase 2: Layout Shell

1. Create `src/components/layout/app-sidebar-new.tsx` — icon sidebar
2. Create `src/components/layout/top-bar.tsx` — topbar
3. Create `src/components/layout/sidebar-skill-pills.tsx` — active skills footer
4. Rewrite `src/app/(dashboard)/layout.tsx` — use new sidebar + topbar
5. Create `src/app/(onboarding)/onboarding/layout.tsx` — fullscreen layout

### Phase 3: Home Page

1. Create `src/components/home/ask-bar.tsx` — centered input
2. Create `src/components/home/activity-feed.tsx` — activity items
3. Create `src/components/home/active-skills-row.tsx` — skill pills
4. Rewrite `src/app/(dashboard)/page.tsx` — compose home components
5. Create `src/hooks/use-activity-feed.ts`
6. Create `src/hooks/use-active-skills-sidebar.ts`

### Phase 4: Skills Pages

1. Create `src/components/skills/skill-card-new.tsx` — emoji card
2. Create `src/components/skills/skill-filter-sidebar.tsx` — PT-BR categories
3. Create `src/components/skills/skill-library-new.tsx` — full library
4. Create `src/components/skills/skill-detail-new.tsx` — rich detail
5. Create `src/components/skills/skill-config-panel.tsx` — configuration
6. Rewrite `src/app/(dashboard)/skills/page.tsx`
7. Rewrite `src/app/(dashboard)/skills/[slug]/page.tsx`

### Phase 5: Onboarding Flow

1. Create `src/components/onboarding/welcome-screen.tsx`
2. Create `src/components/onboarding/connect-screen.tsx`
3. Create `src/components/onboarding/analyzing-screen.tsx`
4. Create `src/components/onboarding/brand-dna-screen.tsx` (with 6 sub-components)
5. Create all Brand DNA sub-components (brand-identity, tone-of-voice, diagnostic, opportunities, revenue, skill-activation)
6. Create onboarding pages (4 pages under `(onboarding)`)
7. Create `src/lib/actions/onboarding.ts`

### Phase 6: Apps Page

1. Create `src/components/apps/app-card.tsx`
2. Create `src/components/apps/apps-grid.tsx`
3. Create `src/app/(dashboard)/apps/page.tsx`

### Phase 7: Polish & Verification

1. Mobile responsive testing (sidebar overlay, single-column content)
2. Remove old layout components (or mark deprecated)
3. Update navigation links across the app
4. `bun run build` — zero errors
5. `bun run lint` — no new warnings
6. Visual comparison with prototype screenshots

## Artifacts

| Artifact      | Path                                   | Description                              |
| ------------- | -------------------------------------- | ---------------------------------------- |
| Research      | [research.md](./research.md)           | 7 decisions with rationale               |
| Data Model    | [data-model.md](./data-model.md)       | Skills expansion, brand_dna, app catalog |
| API Contracts | [contracts/api.md](./contracts/api.md) | Queries, actions, hooks, routes          |
| Quickstart    | [quickstart.md](./quickstart.md)       | Dev setup and verification checklist     |
