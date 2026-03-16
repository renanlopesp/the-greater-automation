# Research: Restore Real Data Integration

**Date**: 2026-03-10
**Status**: Complete — no unknowns to resolve

## Summary

This is a restoration feature. All technology decisions were already made in previous specs. No new dependencies, patterns, or infrastructure are needed. The research phase confirms that all required infrastructure is intact and ready to use.

## Findings

### 1. Query Infrastructure Status

**Decision**: Use existing query functions as-is — no modifications needed.
**Rationale**: All query files in `/lib/queries/` are intact and unchanged from when they were last used. The functions accept a Supabase client and team/user IDs, returning typed data.
**Alternatives considered**: Creating new query functions — rejected because existing ones cover all needed operations.

**Verified files**:

- `dashboard.ts` — `fetchTeam()`, `fetchAgentsWithSkills()`, `fetchWorkflows()`, `fetchRunsToday()`
- `agents.ts` — agent fetching with skills
- `agent-conversations.ts` — `getActiveConversation()`, `getConversationMessages()`
- `workspace.ts` — workspace items

### 2. Agent Detail Components Status

**Decision**: Re-import existing components from `/components/agent-detail/`.
**Rationale**: All 12+ components (ChatPanel, AgentSidebar, SetupChecklist, etc.) still exist with their original implementations. They accept typed props and render correctly.
**Alternatives considered**: Rewriting components to match new visual design — rejected because the spec requires preserving existing functionality, and these components are tested.

### 3. Client Component Modification Pattern

**Decision**: Add optional props to client components, falling back to static data when props are not provided.
**Rationale**: This allows incremental migration — pages can be restored one at a time without breaking others. Once all pages pass real data, the static fallback can be removed.
**Alternatives considered**: Hard-switch from static to prop-based — rejected because it would require all pages to be modified simultaneously.

### 4. Auth + Team Resolution Pattern

**Decision**: Use established pattern: `createServerClient()` → `auth.getUser()` → `getActiveTeamId()` → redirect if missing.
**Rationale**: This is the standard pattern used across all existing server components in the app. Proven and consistent.

### 5. Pages That Never Existed on Main

**Decision**: `/agents` (discover), `/apps`, `/history`, `/chat` pages need new server-side data fetching since they never existed on main branch.
**Rationale**: These pages were created as part of the layout redesign (spec 031) with static data only. The query infrastructure exists but the pages never had server components.
**Approach**: Follow the same pattern as restored pages — async server component → fetch → pass props.

### 6. Composio App Catalog

**Decision**: Use existing `getAppConnections()` and `getComposioApps()` from `/lib/composio/actions/`.
**Rationale**: These functions are intact and handle the Composio API integration. The apps page needs to merge the catalog with user's connection status from `app_connections` table.
