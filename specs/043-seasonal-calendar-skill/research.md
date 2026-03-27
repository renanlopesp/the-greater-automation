# Research: Seasonal Calendar Skill

## R1: Artifact Navigation Pattern

**Decision**: Use a navigation stack (array of levels) managed via React context, similar to the prototype's `useArtifactNav()` hook.

**Rationale**: The artifact panel has 3 levels of nested content. A stack-based approach makes back navigation trivial (pop the stack), supports breadcrumb labels (each level has a title), and is easily extensible for future skills with different navigation depths.

**Alternatives considered**:

- URL-based routing (query params for artifact level): Rejected — would cause full page re-renders and add complexity to the URL structure
- Zustand store: Rejected — overkill for component-local state; context is simpler and scoped to the workspace

## R2: Draggable Divider Implementation

**Decision**: Use pointer events (onPointerDown/Move/Up) with a thin divider element. Store panel widths as percentages in local state.

**Rationale**: Simple, no external dependencies. Pointer events work on both mouse and touch. Percentage-based widths ensure the layout stays proportional on resize.

**Alternatives considered**:

- CSS `resize` property: Rejected — doesn't support dual-panel proportional resizing
- react-resizable-panels library: Rejected — adds a dependency for a simple feature; YAGNI principle

## R3: Campaign Data Storage

**Decision**: Store campaign data as static TypeScript files in `src/data/campaign-data.ts`. Each seasonal date maps to a campaign object with concept, products, copies, assets, video, and timeline.

**Rationale**: The spec explicitly states campaign data is mock/static in this iteration. TypeScript files give full type safety, are easy to edit, and require no database schema changes. When AI generation is added later, the same data shape will be used — only the source changes.

**Alternatives considered**:

- Database tables for campaigns: Rejected — premature; no AI generation yet, so no dynamic data to store
- JSON files: Rejected — lose TypeScript type checking

## R4: Skill Detail Page Routing

**Decision**: Use the existing `[slug]` dynamic route at `src/app/(dashboard)/skills/[slug]/page.tsx`. When slug matches a skill with a workspace (like "seasonal-calendar"), render the SkillWorkspace. Otherwise, render the existing skill detail view.

**Rationale**: Reuses the existing routing structure. No new routes needed. The page component decides which view to render based on the skill's capabilities.

**Alternatives considered**:

- Separate route like `/skills/seasonal-calendar/workspace`: Rejected — adds URL complexity; the workspace IS the skill page
- Route groups: Rejected — unnecessary structure for a single conditional render

## R5: Chat Implementation Scope

**Decision**: Build the chat UI (input, messages, suggestions) without real AI responses. Messages display in the chat, and clicking quick actions sends pre-defined messages with static responses.

**Rationale**: Spec states chat responses are simulated. Building the full AI chat pipeline (streaming, tool calls, etc.) is out of scope. The existing orchestrator chat system (`useOrchestratorChat`) can be adapted later.

**Alternatives considered**:

- Skip chat entirely: Rejected — the workspace layout needs both panels; chat provides the interaction surface
- Full AI integration: Rejected — out of scope per spec assumptions

## R6: Skill Seeding Strategy

**Decision**: Add a `seedSeasonalCalendar` server action to `src/lib/actions/skills.ts` that upserts a single skill record for the team. Call it from the onboarding flow or expose as a manual action.

**Rationale**: The `skills` table exists. The `seedTeamSkills` action already exists but seeds ALL skills from the static registry. We need a targeted seed for just the Seasonal Calendar with real metadata.

**Alternatives considered**:

- Database migration: Rejected — skills are team-scoped, can't seed for all teams via migration
- Seed all skills at once: Could work but bloats the DB with unused skills; prefer seeding on activation
