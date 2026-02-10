# Research: Workspace Graph View & Polish

**Branch**: `012-workspace-polish` | **Date**: 2026-02-10
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R-001: Graph Library Choice

**Question**: Which React graph/network visualization library should we use?

### Options Evaluated

| Library                        | Bundle Size | React Support       | Custom Nodes         | Zoom/Pan | TypeScript       | Maintenance             |
| ------------------------------ | ----------- | ------------------- | -------------------- | -------- | ---------------- | ----------------------- |
| @xyflow/react (React Flow v12) | ~150KB      | Native React        | Yes (JSX components) | Built-in | Built-in         | Active, well-maintained |
| D3.js                          | ~250KB      | Manual DOM binding  | Manual SVG           | Manual   | @types/d3        | Active                  |
| vis.js / vis-network           | ~300KB      | Wrapper needed      | Limited              | Built-in | Partial          | Moderate                |
| Sigma.js / react-sigma         | ~100KB      | react-sigma wrapper | Limited              | Built-in | Built-in         | Active                  |
| cytoscape.js                   | ~200KB      | Manual binding      | CSS-based            | Built-in | @types/cytoscape | Active                  |

### Decision: `@xyflow/react` (React Flow v12)

**Rationale**:

1. **Native React**: Nodes are regular React components rendered as JSX. This means we can reuse shadcn/ui primitives (Badge, Avatar, Button) inside nodes without any DOM manipulation workaround.
2. **Custom nodes**: Each node type (agent, workflow) gets its own React component with full access to props, hooks, and Tailwind classes.
3. **Built-in interactivity**: Zoom, pan, node dragging, edge selection, and viewport controls are built in and work out of the box.
4. **TypeScript first**: The library is written in TypeScript and exports strongly typed Node, Edge, and event handler types.
5. **Active ecosystem**: React Flow is the most popular React graph library, with extensive documentation and community support.
6. **Reasonable bundle size**: ~150KB gzipped is acceptable for a feature-gated view (only loaded when the user switches to graph view).

**Rejected alternatives**:

- **D3**: Too low-level. Requires manual DOM manipulation and SVG rendering, which conflicts with our React component model. Would need significant boilerplate to support custom node rendering with shadcn components.
- **vis.js**: Weak React integration. Requires imperative API calls and DOM refs rather than declarative JSX. Custom node rendering is limited to HTML strings, not React components.
- **Sigma.js**: Optimized for WebGL rendering of very large graphs (10K+ nodes). Overkill for our use case (< 500 nodes). Custom node rendering is more limited.
- **cytoscape.js**: CSS-based node styling is less flexible than React component nodes. React integration requires manual lifecycle management.

---

## R-002: Auto-Layout Algorithm

**Question**: Which algorithm should compute the x/y positions of graph nodes?

### Options Evaluated

| Algorithm             | Library | Bundle Size | Layout Style                           | Speed                        | Configurability           |
| --------------------- | ------- | ----------- | -------------------------------------- | ---------------------------- | ------------------------- |
| Dagre                 | dagre   | ~30KB       | Hierarchical (tree/DAG)                | Fast (< 100ms for 500 nodes) | rankdir, nodesep, ranksep |
| ELK                   | elkjs   | ~200KB      | Multi-algorithm (layered, force, etc.) | Moderate                     | Extensive (50+ options)   |
| Custom force-directed | None    | 0KB         | Force/spring                           | Slow for large graphs        | Full control              |
| Manual grid           | None    | 0KB         | Grid                                   | Instant                      | None                      |

### Decision: `dagre`

**Rationale**:

1. **Hierarchical layout**: Our graph has a natural hierarchy -- agents are parents, workflows are children. Dagre's layered layout (similar to Graphviz's `dot`) produces clean, readable arrangements for this structure.
2. **Small bundle**: ~30KB gzipped. Minimal impact on overall bundle size.
3. **Fast**: Computes layout for 500 nodes in under 100ms. No performance concern.
4. **Well-documented with React Flow**: The React Flow documentation includes an official dagre integration example, reducing implementation risk.
5. **Simple API**: Set graph options, add nodes with dimensions, add edges, call `dagre.layout()`, read positions. No complex configuration.

**Rejected alternatives**:

- **ELK**: 200KB+ bundle for features we do not need. The layered algorithm in ELK is similar to dagre but wrapped in a much larger package. Overkill per Constitution V (Simplicity and YAGNI).
- **Custom force-directed**: Slow convergence for larger graphs, non-deterministic results (different positions on each render), and requires significant implementation effort for edge bundling and collision avoidance.
- **Manual grid**: Does not handle varying node counts or hierarchical relationships. Would produce poor layouts for graphs with varying agent-to-workflow ratios.

---

## R-003: Optimistic UI Pattern

**Question**: How should we implement optimistic updates for workspace mutations?

### Options Evaluated

| Approach                     | Complexity | React Version | Revert Mechanism       | State Management             |
| ---------------------------- | ---------- | ------------- | ---------------------- | ---------------------------- |
| React 19 `useOptimistic`     | Low        | 19+           | Automatic on re-render | Built-in                     |
| Local state + manual revert  | Low        | Any           | Manual try/catch       | useState                     |
| TanStack Query `useMutation` | Medium     | Any           | `onError` callback     | External (already installed) |
| Zustand optimistic store     | Medium     | Any           | Manual rollback action | External (already installed) |

### Decision: React 19 `useOptimistic`

**Rationale**:

1. **Built into React 19**: No additional dependencies. The hook is designed exactly for this use case -- showing optimistic state while a server action is pending.
2. **Automatic revert**: When the server action completes (success or failure), React automatically reconciles the optimistic state with the actual state. On failure, the optimistic change is reverted when the real data re-renders.
3. **Works with Server Components**: `useOptimistic` is designed for the App Router model where data flows from Server Components to Client Components. After `router.refresh()`, the Server Component re-fetches and passes fresh `initialItems`, automatically replacing the optimistic state.
4. **Simple API**: `const [optimisticItems, addOptimisticAction] = useOptimistic(initialItems, reducer)`. The reducer handles delete (filter out item) and status change (map + update).

**Rejected alternatives**:

- **Local state + manual revert**: More boilerplate. Requires manually tracking previous state and reverting in a catch block. `useOptimistic` does this automatically.
- **TanStack Query `useMutation`**: Would require restructuring the data flow to use client-side fetching instead of Server Component data passing. Adds complexity without clear benefit for this use case.
- **Zustand store**: Would duplicate the workspace data in a client-side store alongside the Server Component data. Unnecessary complexity.

---

## R-004: Keyboard Navigation Approach

**Question**: How should keyboard navigation be implemented in the workspace table?

### Options Evaluated

| Approach                       | Accessibility             | Complexity | Browser Support | Framework Integration                        |
| ------------------------------ | ------------------------- | ---------- | --------------- | -------------------------------------------- |
| Roving tabindex                | Excellent (ARIA standard) | Medium     | Universal       | Works with any table                         |
| Custom keydown handler         | Good (manual ARIA)        | Low        | Universal       | Tight integration with @tanstack/react-table |
| @tanstack/react-table built-in | N/A (not supported)       | N/A        | N/A             | N/A                                          |
| aria-activedescendant          | Excellent (ARIA standard) | Medium     | Universal       | Requires container focus                     |

### Decision: Custom keydown handler with roving tabindex

**Rationale**:

1. **Hybrid approach**: Use a custom `onKeyDown` handler on the table container (`<tbody>`) that manages a `focusedIndex` state. Each row gets `tabIndex={isFocused ? 0 : -1}` (roving tabindex pattern) so only the focused row is in the tab order.
2. **@tanstack/react-table integration**: The handler reads row data from the table instance to determine navigation targets (e.g., which item to open on Enter, which item to delete on Delete).
3. **ARIA compliance**: Focused rows get `aria-selected="true"`. The table container gets `role="grid"` with `aria-activedescendant` pointing to the focused row ID.
4. **Simplicity**: A single `useKeyboardNavigation` hook encapsulates all keyboard logic. The hook returns `focusedIndex` and an `onKeyDown` handler. The table component applies these to rows.

**Rejected alternatives**:

- **Pure roving tabindex**: More complex to implement correctly with dynamic row rendering and sorting. Would need to manage tabIndex across re-renders.
- **@tanstack/react-table built-in**: The library does not include keyboard navigation. It focuses on data management, not UI behavior.
- **aria-activedescendant only**: Requires the container (not individual rows) to hold focus, which conflicts with row-level click handlers and checkbox interactions.
