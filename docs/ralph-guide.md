# Ralph Implementation Guide — Relay

## Overview

This guide drives Ralph Loop iterations for implementing Relay features. Each iteration, Ralph reads this file, determines current state, executes tasks, validates with subagents, and marks progress.

## Feature Execution Order

| #   | Feature                     | Spec Dir                         | Max Iterations |
| --- | --------------------------- | -------------------------------- | -------------- |
| 1   | Foundation & Infrastructure | `specs/001-foundation/`          | 30             |
| 2   | Navigation & Layout         | `specs/002-navigation-layout/`   | 25             |
| 3   | Settings & Auth             | `specs/006-settings-auth/`       | 25             |
| 4   | Dashboard & Workspace       | `specs/003-dashboard-workspace/` | 35             |
| 5   | Workflow Editor             | `specs/004-workflow-editor/`     | 35             |
| 6   | Agent System                | `specs/005-agent-system/`        | 25             |
| 7   | Visual Review & Polish      | `specs/007-visual-review/`       | 20             |

> **Why 006 before 003?** Auth pages (login/signup) are required to manually test any authenticated page.

## Iteration Protocol

### Step 1: Discover Current State

At the start of EVERY iteration:

1. **Find active feature**: Check each feature's `tasks.md` in execution order. The active feature is the first one with uncompleted tasks (`- [ ]`).

2. **Read context files** for the active feature:
   - `specs/XXX/tasks.md` — task checklist (primary driver)
   - `specs/XXX/plan.md` — architecture, data model, component interfaces
   - `specs/XXX/spec.md` — user stories, acceptance criteria

3. **Count progress**:
   - Total tasks: count all `- [ ]` and `- [x]` lines
   - Completed: count `- [x]` lines
   - Remaining: count `- [ ]` lines
   - Current phase: identify the phase containing the first uncompleted task

4. **Report status** before doing work:
   ```
   Feature: XXX-name (N/M tasks complete)
   Current Phase: Phase N - Name
   Next task: TXXX — description
   ```

### Step 2: Execute Tasks

For each uncompleted task in the current phase:

1. **Read the task description** carefully — it includes exact file paths and requirements
2. **Read the plan.md** for relevant implementation details (data model, component interfaces, TypeScript types)
3. **Implement the task** following the spec precisely
4. **Mark the task as done**: Edit `tasks.md` and change `- [ ]` to `- [x]` for that specific task
5. **Move to next task** in the phase

**Execution rules**:

- Tasks marked `[P]` within the same phase can be implemented in parallel (different files, no dependencies)
- Tasks WITHOUT `[P]` must be done sequentially
- If a task modifies a file that a previous `[P]` task also modifies, do them sequentially
- Follow the phase order strictly — do NOT skip ahead

**Per iteration goal**: Complete **one full phase** (or as many tasks as fit in context). Do not try to do all phases in one iteration.

### Step 3: Validate with Subagents

After completing each phase, launch validation subagents:

#### A. Build Validation (ALWAYS after every phase)

```
Launch Bash subagent: "Run bun run build and report any errors"
```

#### B. Lint Validation (ALWAYS after code changes)

```
Launch Bash subagent: "Run bun run lint and report any warnings or errors"
```

#### C. Test Validation (after 001-foundation Phase 6 is complete)

```
Launch Bash subagent: "Run bun run test and report results"
```

#### D. E2E Validation (after creating pages/routes)

```
Launch Bash subagent: "Run bun run test:e2e and report results"
```

#### E. Visual Layout Check (after implementing UI components)

Use Playwright MCP tools to verify pages render correctly:

```
1. browser_navigate to the page URL (e.g., http://localhost:3000/dashboard)
2. browser_snapshot to capture accessibility tree
3. browser_take_screenshot to capture visual output
4. Verify: layout matches spec, components render, no visual bugs
```

**Visual checks to perform per feature:**

- 002: `/dashboard` — sidebar renders, nav icons visible, usage meters
- 006: `/login`, `/signup` — auth forms render, OAuth button
- 003: `/dashboard` — agent cards, workflow tabs; `/workspace` — table; `/runs` — table or empty state
- 004: `/workflows/test-id/edit` — 3-panel layout, top bar, canvas
- 005: `/agents/test-id` — two-panel layout, avatar, heatmap
- 007: All pages in BOTH light and dark mode — sidebar indigo, dashboard run data, editor full-width, agent detail blue panel, app icons, theme toggle

#### F. Code Review (after each feature completes)

```
Launch Explore subagent: "Review all files created in this feature for:
- TypeScript strict compliance (no `any` types)
- All imports use @/ path alias
- All className use cn() for dynamic composition
- No hex/rgb colors (all via CSS variables)
- Server Components by default, 'use client' only where needed
- Constitution compliance"
```

### Step 4: Fix Issues

If any validation fails:

1. Read the error output carefully
2. Fix the issue in the relevant file
3. Re-run the failed validation
4. Do NOT proceed to next phase until all validations pass

### Step 5: Phase Completion

After all tasks in a phase are done AND validations pass:

1. Verify all tasks in the phase are marked `[x]` in tasks.md
2. Move to next phase in Step 2

### Step 6: Feature Completion

When ALL tasks in ALL phases of a feature are `[x]`:

1. Run final validation suite:
   - `bun run build` — zero errors
   - `bun run lint` — zero warnings
   - `bun run test` — all pass (if tooling set up)
   - `bun run test:e2e` — all pass (if e2e tests exist)

2. Visual check key pages with Playwright MCP

3. Create git commit:

   ```
   git add -A
   git commit -m "feat: implement XXX-feature-name

   - [summary of what was built]
   - All N tasks complete
   - Build, lint, tests pass"
   ```

4. **If more features remain**: Continue to next feature in execution order
5. **If all features complete**: Output completion promise

## Completion Promise

Output this ONLY when ALL of the following are true:

- Current feature's tasks.md has 0 remaining `- [ ]` items
- `bun run build` passes with zero errors
- `bun run lint` passes with zero warnings
- `bun run test` passes (if applicable)
- Git commit created

The completion promise for each feature is: `"XXX-feature-name complete"`

## Key Principles (from Constitution)

- **Next.js App Router First**: Server Components by default, `"use client"` only when needed
- **shadcn/ui**: Use shadcn primitives, add via `bunx shadcn@latest add <component>`
- **Tailwind v4 + OKLCH**: No hex/rgb, all colors via CSS variables
- **TypeScript Strict**: No `any` types, Zod for runtime validation
- **YAGNI**: Simplest solution, no premature abstractions
- **Supabase as Backend**: RLS on all tables, cookie-based sessions
- **Package manager**: `bun` (not npm/yarn)
- **Path alias**: `@/` maps to `src/`
- **Utility**: `cn()` from `@/lib/utils` for all dynamic classNames

## Reference Screenshots

The following screenshots in the project root show the target UI:

- `relay-dashboard.png` — Dashboard page layout
- `relay-workspace.png` — Workspace page layout
- `relay-runs.png` — Runs page layout
- `relay-workflow-editor.png` — Workflow editor 3-panel layout
- `relay-agent-detail.png` — Agent detail page
- `relay-trigger-types.png` — Trigger type selector
- `relay-add-step-types.png` — Step type selector
- `relay-manual-trigger-config.png` — Manual trigger configuration
- `relay-apps-settings.png` — App integrations settings
