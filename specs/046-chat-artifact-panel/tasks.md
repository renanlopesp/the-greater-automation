# Tasks: Chat with Artifact Side Panel

**Branch**: `feat/chat-artifact-panel` | **Plan**: [plan.md](./plan.md)

## Phase 1: Chat Context & Layout Shell

### Task 1.1: Create ChatContext provider

- **File**: `src/contexts/chat-context.tsx`
- **Action**: Create new file
- **Details**:
  - `"use client"` context provider
  - State: `chatTitle`, `artifactOpen`, `onCloseArtifact`, `onReopenArtifact`, `chatWidthPx`
  - `setChatTitle(title)` — updates header display
  - `setArtifactOpen(open)` — toggles side panel
  - `setChatWidthPx(px)` — persists to `localStorage("snew-chat-width")`
  - Default `chatWidthPx` = 50% of container, `artifactOpen` = false
- **Dependencies**: None
- **Acceptance**: Context values accessible from child components.

### Task 1.2: Create ChatLayout with draggable split

- **File**: `src/components/chat/chat-layout.tsx`
- **Action**: Create new file
- **Details**:
  - `"use client"` — needs mouse events for drag
  - Flex row: chat panel (left) + drag handle (8px) + artifact panel (right)
  - Drag handle: `width: 8px`, `cursor: col-resize`, `bg: transparent`, hover: `bg: var(--border)`
  - When artifact closed: chat = 100%, hide drag handle + artifact
  - When artifact open: chat width from `chatWidthPx`, artifact = `flex: 1`
  - Artifact panel: `background: var(--muted)`, `borderLeft: 1px solid var(--border)`
  - `onMouseDown` on handle → track mouse move → update `chatWidthPx`
  - Min chat width: 400px, min artifact width: 300px
  - Persist width to localStorage `"snew-chat-width"`
  - Props: `chatContent: ReactNode`, `artifactContent: ReactNode | null`
- **Dependencies**: Task 1.1
- **Acceptance**: Dragging divider resizes panels. Width persists across page loads.

### Task 1.3: Create ChatHeader

- **File**: `src/components/chat/chat-header.tsx`
- **Action**: Create new file
- **Details**:
  - `"use client"` — reads ChatContext
  - Height: `48px`, same as TopBar
  - **Chat zone** (left): title text (14px, 500 weight, truncate maxWidth 240px) + ChevronDown + separator + MoreHorizontal + action pills (FileText "3", Zap "2.4k", ListChecks "Tarefa") + "Compartilhar" button (Share2 icon + text, borderRadius full, border)
  - **Artifact zone** (right, only when artifact open): ExternalLink + Download + MoreHorizontal + Maximize2 + X close button — separated by 1px vertical divider
  - Action pills: `borderRadius: full`, `border`, `bg: var(--secondary)`, `fontSize: 12px`
  - "Compartilhar" button: `fontSize: 13px`, `fontWeight: 500`, border pill
  - Artifact toggle: PanelRight icon (shows when artifact closed, replaces artifact zone)
  - X close: calls `onCloseArtifact()` from ChatContext
  - PanelRight: calls `onReopenArtifact()` from ChatContext
  - All action buttons are **visual-only** (no functionality) except artifact toggle
- **Dependencies**: Task 1.1
- **Acceptance**: Header renders correctly in both artifact-open and artifact-closed states.

---

## Phase 2: Empty State & Input

### Task 2.1: Create ChatEmptyState

- **File**: `src/components/chat/chat-empty-state.tsx`
- **Action**: Create new file
- **Details**:
  - Centered vertically and horizontally in chat panel
  - ChatAvatar: `size={44}`, pulse animation (`animation: avatar-pulse-scale 2s ease-in-out infinite`)
  - Add `@keyframes avatar-pulse-scale` to globals.css: scale 1 → 1.05 → 1
  - Heading: `<h2>` "What can I help you with?", centered
  - Subtitle: "Ask anything about your store — Snew routes your question to the right co-workers.", `fontSize: 14px`, `color: var(--muted-foreground)`, centered
  - 4 suggestion chips: `borderRadius: 20px`, `border: 0.5px solid var(--border)`, `fontSize: 11px`, `color: var(--muted-foreground)`, flex-wrap centered
  - Chips text:
    - "What drove the most revenue for Minha Loja this week?"
    - "Which products have the highest return rate?"
    - "Are there customers at risk of churning?"
    - "What are competitors doing that I should react to?"
  - `onChipClick(text)` → sends as chat message
- **Dependencies**: None
- **Acceptance**: Empty state renders centered with avatar, text, and clickable chips.

### Task 2.2: Create ChatInput

- **File**: `src/components/chat/chat-input.tsx`
- **Action**: Create new file
- **Details**:
  - `"use client"` — owns textarea state + auto-resize
  - Container: relative, `maxWidth: 680px`, centered, pinned to bottom of chat panel
  - Textarea: `borderRadius: 28px`, `padding: 14px 52px 14px 20px`, `minHeight: 52px`, `maxHeight: 160px`
  - Auto-resize: `scrollHeight` on change, cap at maxHeight
  - Border: `1px solid var(--border)`, focus: `boxShadow: 0 4px 12px rgba(0,0,0,0.06)`
  - Background: `var(--background)`
  - Placeholder: "Ask Snew anything..."
  - Send button: `34px` circle, `position: absolute`, bottom-right (12px offset), `ArrowUp` icon 16px
  - Active (has text): `bg: var(--foreground)`, `color: var(--background)`
  - Empty: `bg: var(--muted)`, `color: var(--muted-foreground)`, `disabled`
  - Enter (no shift) → submit, Shift+Enter → newline
  - Props: `onSend: (message: string) => void`, `disabled?: boolean`, `placeholder?: string`
- **Dependencies**: None
- **Acceptance**: Input auto-resizes, send on Enter, button toggles active/inactive.

---

## Phase 3: Messages & Conversation

### Task 3.1: Create ChatMessage component

- **File**: `src/components/chat/chat-message.tsx`
- **Action**: Create new file
- **Details**:
  - Two variants based on `role` prop: `'assistant'` or `'user'`
  - **Assistant message**:
    - Row: ChatAvatar `size={22}` + "Snew" label (`14px`, `500 weight`)
    - Message text: `fontSize: 14px`, `lineHeight: 1.65`, `marginBottom: 24px`
    - Render markdown with existing Streamdown/ReactMarkdown
  - **User message**:
    - `alignSelf: flex-end`
    - `background: var(--muted)`, `borderRadius: 20px`, `padding: 9px 18px`
    - `fontSize: 14px`, `maxWidth: 60%`
  - Props: `role: 'assistant' | 'user'`, `content: string`
- **Dependencies**: BubbleAvatar from design-system (or simpler ChatAvatar)
- **Acceptance**: Both message types render correctly with proper alignment and styles.

### Task 3.2: Create ContinueWith component

- **File**: `src/components/chat/chat-continue-with.tsx`
- **Action**: Create new file
- **Details**:
  - Label: "Continue with", `fontSize: 10px`, `fontWeight: 500`, `color: var(--muted-foreground)`, `letterSpacing: 0.02em`, `marginBottom: 8px`
  - Items: array of strings, each rendered as a row with:
    - "↳" prefix (muted-foreground)
    - Text: `fontSize: 13px`, `color: var(--muted-foreground)`, hover → `color: var(--foreground)`
    - `borderBottom: 1px solid var(--border)` between items (last has no border)
    - `cursor: pointer`, `padding: 10px 0`
  - `onClick(text)` → sends as new chat message
  - Props: `items: string[]`, `onSelect: (text: string) => void`
- **Dependencies**: None
- **Acceptance**: Items render with borders, hover state, and click sends message.

### Task 3.3: Create TypingIndicator

- **File**: `src/components/chat/typing-indicator.tsx`
- **Action**: Create new file
- **Details**:
  - 3 dots: `6px` circles, `background: var(--muted-foreground)`
  - Animation: `@keyframes typing-dot` — `translateY(-3px)` at 30%, stagger `0.15s`
  - Add keyframes to globals.css
  - Wrapper: `display: flex`, `gap: 4px`, `padding: 8px 0`
- **Dependencies**: None
- **Acceptance**: 3 dots animate in sequence.

### Task 3.4: Wire up useChat with existing API

- **File**: `src/app/(dashboard)/chat/page.tsx` (will be fully rewritten in Phase 5)
- **Action**: Verify existing `/api/chat` works with `useChat` from AI SDK
- **Details**:
  - Test that `useChat({ api: '/api/chat' })` streams responses correctly
  - Map `messages` to ChatMessage components
  - Map `isLoading` to TypingIndicator
  - Handle chip clicks → `append({ role: 'user', content: chipText })`
  - Handle ContinueWith → `append({ role: 'user', content: selectedText })`
- **Dependencies**: Tasks 3.1, 3.2, 3.3
- **Acceptance**: Sending a message gets a streaming AI response.

---

## Phase 4: Artifact Panel

### Task 4.1: Create ArtifactPanel shell

- **File**: `src/components/chat/artifact-panel.tsx`
- **Action**: Create new file
- **Details**:
  - `"use client"` — reads artifact state
  - Outer container: `flex: 1`, `background: var(--muted)`, `borderLeft: 1px solid var(--border)`, `overflow-y: auto`
  - Inner scroll container: `maxWidth: 620px`, `padding: 28px 32px`, `margin: 0 auto`
  - Skeleton loading state: shimmer placeholders (title + 5 rows)
  - Renders children (artifact content)
  - framer-motion `AnimatePresence` for enter/exit animations
- **Dependencies**: Task 1.1
- **Acceptance**: Panel renders with correct bg, border, padding. Skeleton shows during load.

### Task 4.2: Create DailySummaryArtifact

- **File**: `src/components/chat/daily-summary-artifact.tsx`
- **Action**: Create new file
- **Details**:
  - Hardcoded `DAILY_SUMMARY` data (from spec)
  - Title: "O que o Snew fez hoje", `fontSize: 24px`, `fontWeight: 600`
  - Subtitle: "Segunda-feira · 4 ações executadas · 1 aguardando você", `fontSize: 13px`, `color: var(--muted-foreground)`
  - 5 action items, each row:
    - Status icon: ✅ (green check, `color: var(--green)`) or ⭕ (pending circle, `color: var(--muted-foreground)`)
    - Title: `fontSize: 14px`, `fontWeight: 500`
    - Skill + metric: `fontSize: 12px`, `color: var(--muted-foreground)`
    - Time (right side): `fontSize: 12px`, `color: var(--muted-foreground)`, `minWidth: 52px`
    - Chevron `>` (right)
    - Pending badge: "aguardando você" in orange
  - Rows separated by `borderBottom: 1px solid var(--border)`
  - Share footer: "Compartilhar" label + WhatsApp/E-mail/Slack pills (visual-only)
- **Dependencies**: None
- **Acceptance**: Daily summary renders with all items, correct status icons, and share footer.

### Task 4.3: Wire artifact open/close

- **Details**:
  - ChatHeader X button → `setArtifactOpen(false)` via ChatContext
  - ChatHeader PanelRight button → `setArtifactOpen(true)`
  - New chat with mock data → auto-open artifact with daily summary
  - Artifact panel animates in/out with framer-motion
- **Dependencies**: Tasks 1.1, 1.3, 4.1, 4.2
- **Acceptance**: Clicking toggle opens/closes artifact panel smoothly.

---

## Phase 5: Page Integration & QA

### Task 5.1: Rewrite chat page

- **File**: `src/app/(dashboard)/chat/page.tsx`
- **Action**: Rewrite
- **Details**:
  - Wrap in `ChatContextProvider`
  - Render `ChatHeader` (replaces TopBar for this route)
  - Render `ChatLayout` with:
    - `chatContent`: empty state OR messages + input
    - `artifactContent`: `DailySummaryArtifact` (when open)
  - Use `useChat` from AI SDK for conversation state
  - On first load: if mock daily data exists, auto-open artifact
  - Handle suggestion chip clicks and ContinueWith selections
- **Dependencies**: All previous tasks
- **Acceptance**: Full chat page works with empty state, messages, artifact panel.

### Task 5.2: Conditionally swap header on chat routes

- **File**: `src/components/dashboard-shell-new.tsx`
- **Action**: Modify
- **Details**:
  - Detect if current route is `/chat` or `/chat/[id]`
  - If chat route: hide global TopBar, let ChatHeader render inside the page
  - OR: pass a `hideTopBar` prop down
- **Dependencies**: Task 1.3
- **Acceptance**: Chat pages show ChatHeader, other pages show TopBar.

### Task 5.3: Visual QA

- **Action**: Compare with prototype screenshots
- **Dependencies**: All tasks
- **Acceptance**: Layout, spacing, colors match prototype within 2px tolerance.

### Task 5.4: Build verification

- **Action**: `bun run build` + `bun run lint`
- **Dependencies**: All tasks
- **Acceptance**: Zero errors.
