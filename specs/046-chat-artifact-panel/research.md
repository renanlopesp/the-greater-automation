# Research: Chat with Artifact Side Panel

## R1: Draggable panel divider implementation

**Decision**: Use `onMouseDown` + `mousemove` + `mouseup` events on a thin handle element, tracking `clientX` delta to update panel widths.

**Rationale**: The prototype (`SimpleChatLayout.tsx`) uses this exact pattern. It's lightweight, no extra dependencies needed. Width stored in `localStorage("snew-chat-width")` as pixel value.

**Alternatives considered**:

- CSS `resize` property → no custom styling, can't constrain min/max per panel
- `react-resizable-panels` library → extra dependency for a single use case
- Flexbox with percentage → harder to persist exact px values

## R2: Chat API integration (useChat vs custom hook)

**Decision**: Use Vercel AI SDK `useChat` hook with existing `/api/chat` endpoint.

**Rationale**: The relay app already has a working `/api/chat` route handler that streams responses. `useChat` from `@ai-sdk/react` (already installed v3.0.88) handles streaming, message state, loading state, and append functionality out of the box.

**Alternatives considered**:

- Custom `useOrchestratorChat` hook (exists in codebase) → more tightly coupled to old orchestrator patterns
- Raw `fetch` with streaming → reinvents what `useChat` already does

## R3: Chat header vs global TopBar

**Decision**: Create a separate `ChatHeader` component that replaces the global TopBar on `/chat` routes. The `DashboardShellNew` conditionally hides TopBar when on chat routes.

**Rationale**: The prototype has a completely different header layout on chat routes (2-zone with title + actions + artifact controls) vs non-chat routes (simple bell + avatar). A separate component is cleaner than adding conditional branches to TopBar.

**Alternatives considered**:

- Single TopBar with chat-mode conditional → too much complexity in one component
- TopBar slot pattern → over-engineering for 2 modes

## R4: Artifact panel state management

**Decision**: Use React Context (`ChatContext`) to share artifact state between ChatHeader (controls) and ChatLayout (panel visibility/width).

**Rationale**: The prototype uses this exact pattern (`ChatContext.tsx`). The artifact open/close must be reflected in both the header (X/reopen buttons) and the layout (panel visibility). Context avoids prop drilling through multiple layers.

**Alternatives considered**:

- Zustand store → overkill for page-scoped state that doesn't persist across routes
- Props drilling → too many intermediate components
- URL state (searchParams) → unnecessarily complex for UI toggle

## R5: ChatAvatar vs BubbleAvatar for messages

**Decision**: Use a simpler `ChatAvatar` component (Bot icon in a circle) for chat messages, not the holographic `BubbleAvatar` from the design system.

**Rationale**: The prototype uses `ChatAvatar.tsx` (a simpler icon-in-circle) for messages at 22px, and `BubbleAvatar` (holographic sphere with SVG filters) only for sidebar skill shortcuts. The holographic effect at 22px would be too small and visually noisy.

**Alternatives considered**:

- BubbleAvatar at 22px → too complex visually at small size, SVG filter overhead
- Static avatar image → requires hosting an image asset
