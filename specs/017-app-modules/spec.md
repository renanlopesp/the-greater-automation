# Feature Spec: App Modules — Modular OAuth-Based Dynamic Forms

**Feature ID**: 017
**Status**: Specification
**Created**: 2026-02-13
**Last Updated**: 2026-02-13

---

## Feature Summary

Replace generic text-input forms in workflow app steps with data-driven dynamic forms. When a user selects an app (e.g., GitHub) and an action (e.g., "Create Issue"), the system shows a categorized action list and renders form fields with real data from the user's connected account (repos as dropdowns, labels as multi-select, etc.) instead of plain text inputs.

**Problem**: Today, App steps ask users to type repo names, channel IDs, and other resource identifiers as plain text. This is error-prone and requires memorization or external lookup.

**Solution**: Fetch and display real resources from the OAuth-connected account, organize actions hierarchically, and cascade dependencies (select repo → load labels for that repo).

---

## User Stories

1. **Action Categories**
   As a user, when I add an App step and select GitHub, I see actions grouped by category (Issue, Branch, PR, Milestone) instead of a flat dropdown.

2. **Dynamic Resource Dropdowns**
   As a user, when I select "Create Issue", the Repository field shows a searchable dropdown of MY actual repos fetched from my GitHub OAuth connection.

3. **Cascading Fields**
   As a user, when I select a repository, cascading fields like Labels and Assignees populate with data from that specific repo.

4. **Text Fields Remain**
   As a user, fields without data sources (like Title, Body) remain as text/textarea inputs.

5. **Multi-App Support**
   As a user, adding a Slack "Send Message" step shows my actual channels in a dropdown.

---

## Requirements

### Functional Requirements

- **F1**: Define module metadata layer that wraps Composio's action schema
  - Metadata includes: action categories, field type overrides, data sources, cascading dependencies
  - Store in `src/lib/composio/modules/` (GitHub, Slack, extensible for other apps)

- **F2**: Categorize actions in the UI
  - Group GitHub actions by category (Issue, Branch, PR, Milestone)
  - Show categories as a multi-level selector or grouped list
  - Maintain search/filter across category boundaries

- **F3**: Render dynamic form fields with real data
  - Fields with a data source render as select/multi-select dropdowns
  - Fetch data via `fetchAppResource` server action (calls Composio SDK)
  - Display human-readable labels, preserve machine-readable IDs for execution

- **F4**: Implement cascading dependencies
  - When a field changes, re-fetch dependent fields (e.g., repo → labels)
  - Use React Query with dependency tracking
  - Show loading state during cascading updates

- **F5**: Preserve execution semantics
  - `AppStepConfig` type `{app_id, action, inputs}` unchanged
  - Inputs always stored as explicit `{fieldName: fieldValue}` pairs (deterministic)
  - No opaque resource objects; all inputs are primitive/string

- **F6**: Support multiple apps
  - Implement GitHub and Slack modules as reference implementations
  - Design is extensible for future apps (Jira, Asana, etc.)

### Non-Functional Requirements

- **NFR1**: Performance
  - Cache resource lists in React Query with appropriate TTL
  - Debounce cascading fetches to avoid N+1 problems

- **NFR2**: User Experience
  - Search/filter on large lists (50+ repos, 100+ labels)
  - Show empty states when no resources available (no repos, not authenticated)
  - Loading states during cascading fetches

- **NFR3**: Testability
  - Unit tests for module definitions (metadata, type mappings)
  - Integration tests for cascading form logic
  - E2E tests for full workflow: select app → action → fill fields → save

- **NFR4**: Type Safety
  - Full TypeScript strict mode compliance
  - Module definitions are strongly typed
  - Form field types match module schema

---

## Architecture

### Module Definition Structure

```typescript
interface AppModule {
  app_id: string
  name: string
  icon?: string

  // Action organization
  actions: {
    [category: string]: {
      displayName: string
      actions: {
        [actionId: string]: {
          displayName: string
          description?: string
        }
      }
    }
  }

  // Field type and data source overrides
  fieldDefaults: {
    [fieldName: string]: {
      type: 'text' | 'textarea' | 'select' | 'multi-select' | 'number' | 'boolean'
      label: string
      placeholder?: string
      description?: string
      required?: boolean

      // Data source: which Composio action to call
      dataSource?: {
        actionId: string
        listKey: string // path in response (e.g., "repositories" or "items")
        labelField: string // which field to display
        valueField: string // which field to store

        // Filter by parent field (cascading)
        parentField?: string
      }
    }
  }

  // Cascading dependencies: if fieldA changes, re-fetch fieldB
  cascades: Array<{
    dependsOn: string // field name
    triggers: string[] // field names to re-fetch
  }>
}
```

### Data Flow

1. **Select App & Action**: User picks GitHub → Create Issue
2. **Fetch Module Metadata**: Load module definition for GitHub
3. **Get Action Schema**: Call Composio to get raw action schema for "Create Issue"
4. **Merge Metadata + Schema**: Combine Composio schema with module overrides (categories, data sources, types)
5. **Render Form**:
   - Text fields render as inputs
   - Fields with data sources render as selects, trigger `fetchAppResource`
6. **Cascading Fetch**:
   - User selects repo → React Query refetches labels for that repo
   - Show loading state until data arrives
7. **Save Step**: `{app_id: "github", action: "create_issue", inputs: {repo: "user/repo", title: "...", labels: ["bug"]}}`

### File Structure

```
src/lib/composio/
├── modules/
│   ├── index.ts                      # Export all modules
│   ├── github.ts                     # GitHub module definition
│   ├── slack.ts                      # Slack module definition
│   └── types.ts                      # AppModule interface
├── actions.ts                        # (existing) fetchAppSchema
└── resources.ts                      # (new) fetchAppResource server action

src/components/workflow/
├── editor/
│   └── AppStepForm.tsx               # (updated) use modules for dynamic form
```

---

## Success Criteria

- [ ] GitHub module with 4+ categories (Issue, Branch, PR, Milestone) defined and tested
- [ ] Slack module with channel/user dropdown implemented
- [ ] Dynamic form fields render with correct types (select/multi-select where data sources exist)
- [ ] Real resource data populates selects from OAuth-connected account
- [ ] Cascading dependencies work (select repo → labels load)
- [ ] Execution stores explicit `{fieldName: fieldValue}` inputs (deterministic, no opaque objects)
- [ ] All existing tests pass
- [ ] Build succeeds with zero type errors
- [ ] E2E test covers: select app → action → fill fields → verify form state

---

## Implementation Notes

- Module definitions are **static metadata**, not fetched at runtime
- Composio SDK calls (`fetchAppResource`) happen on the server (action)
- React Query manages client-side cache and cascading refetch logic
- Search/filter on large lists uses native HTML `<select>` filtering or shadcn `<Command>`
- Form state remains in Zustand store (workflow editor); modules do not manage state directly

---

## Risks & Mitigation

| Risk                        | Impact                                      | Mitigation                                                        |
| --------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| Cascading fetches N+1       | Performance degradation                     | Debounce with React Query, cache aggressively                     |
| Stale resource data         | UX confusion (repo deleted but still shown) | Refresh on app step focus, show "not found" for deleted resources |
| Large resource lists        | Slow renders                                | Pagination or search-as-you-type in select field                  |
| Module extension complexity | Maintenance burden                          | Provide clear TypeScript types and examples                       |

---

## References

- **Composio SDK**: [composio-js docs](https://docs.composio.dev)
- **React Query**: [tanstack-query docs](https://tanstack.com/query)
- **Zustand**: [zustand docs](https://github.com/pmndrs/zustand)
- **shadcn/ui Command**: [shadcn/ui Command docs](https://ui.shadcn.com/docs/components/command)
