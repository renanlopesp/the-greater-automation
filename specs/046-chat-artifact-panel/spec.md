# Feature Specification: Chat with Artifact Side Panel

**Feature Branch**: `feat/chat-artifact-panel`
**Created**: 2026-03-30
**Status**: Draft
**Prototype**: `~/Projects/snew-ai-core/` (Vite app at `localhost:8080`)
**Input**: Implement a Perplexity-style chat with a collapsible artifact side panel. Chat must remain functional (real API). Artifact panel and daily summary are mock.

---

## Overview

Redesign the chat page (`/chat`) with a **2-panel layout**:

- **Left panel**: Chat conversation (messages, input, suggestions)
- **Right panel**: Artifact/deliverable side panel (collapsible, shows structured content)

When opening a new chat, if there are recent tasks/actions, show a **daily summary** as the initial artifact. Otherwise, show a **welcome/empty state** with Snew avatar and 4 suggestion prompts.

The chat must remain **fully functional** (uses existing `/api/chat` orchestrator endpoint). Everything else (artifact content, daily summary, task list) is **mock data**.

---

## User Scenarios & Testing

### User Story 1 - New Chat Empty State (Priority: P1)

A user navigates to `/chat` (new conversation). They see a centered empty state with the Snew holographic avatar, "What can I help you with?" heading, subtitle text, 4 suggestion buttons, and a bottom-pinned chat input.

**Acceptance Scenarios**:

1. **Given** the user navigates to `/chat`, **When** the page loads, **Then** they see the Snew avatar, heading, subtitle, and 4 suggestion buttons centered in the chat area.
2. **Given** the empty state is shown, **When** the user clicks a suggestion, **Then** the message is sent as a chat message and the AI responds.
3. **Given** the empty state is shown, **When** the user types in the input and presses Enter, **Then** the message is sent and the conversation begins.

#### Empty State Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: "Tarefas" | search | filter | tokens | collapse │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                    [Snew Avatar]                         │
│            What can I help you with?                    │
│  Ask anything about your store — Snew routes your       │
│       question to the right co-workers.                 │
│                                                         │
│   [What drove the most revenue this week?]              │
│   [Which products have highest return?] [Churn risk?]   │
│   [What are competitors doing?]                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [Ask Snew anything...]                          [send]  │
└─────────────────────────────────────────────────────────┘
```

**Specs** (from prototype `NewChatPage.tsx`):

- Snew avatar: `ChatAvatar size={44}` with `pulse` animation (not BubbleAvatar), centered
- Heading: "What can I help you with?", `<h2>`, centered
- Subtitle: "Ask anything about your store — Snew routes your question to the right co-workers.", `fontSize: 14px`, `color: var(--muted-foreground)`, centered
- Suggestion buttons: `borderRadius: 20px`, `border: 0.5px solid var(--border)`, `fontSize: 11px`, `color: var(--muted-foreground)`, pill layout
- Input: bottom-pinned ChatInput (borderRadius 28px, "Ask Snew anything...")

---

### User Story 2 - Chat Conversation with Messages (Priority: P1)

A user sends a message. The chat shows messages from the user and Snew (AI) in a conversation thread. Each Snew message has the holographic avatar, name "Snew", message text, and optional "Continue with" suggestions.

**Acceptance Scenarios**:

1. **Given** the user sends a message, **When** the AI responds, **Then** the response appears with a Snew avatar, name, and formatted text.
2. **Given** a Snew response is shown, **When** it includes "Continue with" suggestions, **Then** 3-4 clickable suggestion links appear below the message.
3. **Given** the chat has messages, **When** the user scrolls, **Then** the input stays pinned at the bottom.

#### Chat Message Layout

```
┌ Message ──────────────────────────────────────────┐
│ [BubbleAvatar 32px]  Snew                         │
│                                                    │
│ Calendário sazonal 2026 atualizado com 10 datas   │
│ priorizadas para a Milkes. 3 datas precisam de    │
│ ação imediata. Potencial total estimado: R$ 548k. │
│                                                    │
│ Continue with                                      │
│ ↳ Ver detalhes de Dia das Mães                    │
│ ↳ Quais datas têm maior potencial?                │
│ ↳ Criar campanha para a próxima data              │
└────────────────────────────────────────────────────┘
```

**Specs** (from prototype source code):

**AgentMessage** (`AgentMessage.tsx`):

- Avatar: ChatAvatar `size={22}` (not BubbleAvatar — uses Bot icon fallback)
- Name: "Snew", `fontSize: 14px`, `fontWeight: 500`
- Message text: `fontSize: 14px`, `lineHeight: 1.65`, `marginBottom: 24px`
- Chat column: `maxWidth: 680px`, `padding: 32px 24px 16px`, centered

**UserBubble** (`UserBubble.tsx`):

- Alignment: right-aligned (`alignSelf: flex-end`)
- Background: `hsl(var(--muted))`
- Border radius: `20px`
- Padding: `9px 18px`
- Font size: `14px`
- Max width: `60%`

**ContinueWith** (`ContinueWith.tsx`):

- Label: `fontSize: 10px`, `fontWeight: 500`, `color: var(--muted-foreground)`, `letterSpacing: 0.02em`, `marginBottom: 8px`
- Items: `fontSize: 13px`, icon "↳" prefix, `borderBottom` between items, hover color transition
- Clickable — sends item text as new chat message

**ChatInput** (`ChatInput.tsx`):

- Textarea: `borderRadius: 28px`, `padding: 14px 52px 14px 20px`, `minHeight: 52px`, `maxHeight: 160px`, auto-resize
- Send button: `34px` circle, absolute bottom-right, `bg: var(--foreground)` when active / `var(--muted)` when empty, ArrowUp icon `16px`
- Focus: `boxShadow: 0 4px 12px rgba(0,0,0,0.06)`
- Placeholder: "Ask Snew anything..."

**TypingIndicator** (`TypingIndicator.tsx`):

- 3 dots: `6px` circles, keyframe `translateY(-3px)` at 30%, stagger `0.15s`

---

### User Story 3 - Chat Header Bar (Priority: P1)

The chat header replaces the default top bar with a chat-specific header showing the conversation title, action buttons, and an artifact toggle.

**Acceptance Scenarios**:

1. **Given** a new chat, **When** the header renders, **Then** it shows "Tarefas" label, search icon, filter icon, token count badge, and collapse button.
2. **Given** a conversation with a title, **When** the header renders, **Then** it shows the title with a dropdown arrow, "..." menu, comment count, token count, "Tarefa" button, "Compartilhar" button, and artifact toggle.

#### Chat Header (conversation active)

```
┌─────────────────────────────────────────────────────────────┐
│ [sidebar] Calendário Sazonal 2026 ▼ | ... | 3 | 2.4k | Tarefa | Compartilhar | [artifact] │
└─────────────────────────────────────────────────────────────┘
```

**Specs**:

- Height: `48px`, same as global header
- Title: `fontSize: 14px`, `fontWeight: 500`, with dropdown icon
- Action buttons: icon buttons with labels, `fontSize: 12px`, border pills
- Token count: lightning bolt icon + count (e.g., "2.4k")
- Comment count: message icon + count (e.g., "3")
- "Tarefa" button: list icon + "Tarefa"
- "Compartilhar" button: share icon + "Compartilhar"
- Artifact toggle: panel icon (right side)

---

### User Story 4 - Artifact Side Panel (Priority: P1)

When the user clicks the artifact toggle (or when an action generates a deliverable), a side panel slides in from the right showing structured content.

**Acceptance Scenarios**:

1. **Given** a conversation with an artifact, **When** the user clicks the artifact toggle, **Then** a side panel opens on the right side, and the chat panel narrows.
2. **Given** the artifact panel is open, **When** the user clicks the close button (X), **Then** the panel closes and the chat expands to full width.
3. **Given** the artifact panel is open, **When** it displays content, **Then** it shows a title, subtitle, description, and structured content (list items, action items, etc.).

#### Artifact Panel Layout

```
┌─ Artifact Panel ─────────────────────────────────┐
│ [open-ext] [download] [...] [expand] [close X]   │
├───────────────────────────────────────────────────┤
│                                                   │
│ O que o Snew fez hoje                             │
│ Segunda-feira · 4 ações executadas ·              │
│ 1 aguardando você                                 │
│                                                   │
│ ✅ Reposição aprovada: Body Comfy · 50 un   07:02│
│    Inventory Manager · Evitou ruptura R$ 8.600    │
│                                                   │
│ ✅ E-mail VIP Dia das Mães · 847 contatos   07:15│
│    Copywriter · Receita estimada R$ 12.400        │
│                                                   │
│ ✅ Review negativo respondido · Google       07:18│
│    Post-Purchase · NPS protegido                  │
│                                                   │
│ ✅ Sequência WhatsApp · 4 clientes VIP      07:20│
│    Retention Engine · LTV R$ 4.200 em risco       │
│                                                   │
│ ⭕ Publicar Reels · aprovação necessária          │
│    Video Script Creator · Alcance 8.400           │
│    [aguardando você]                              │
│                                                   │
├───────────────────────────────────────────────────┤
│ Compartilhar | WhatsApp | E-mail | Slack          │
└───────────────────────────────────────────────────┘
```

**Specs** (from prototype `ActionChatContent.tsx` + `ArtifactContent.tsx`):

- Width: `flex: 1` (takes remaining space after chat column), **draggable divider** (8px handle)
- Background: `var(--artifact-bg, #f7f6f3)` / `var(--muted)`
- Border: `borderLeft: 1px solid var(--border)`
- Inner scroll: `maxWidth: 620px`, `padding: 28px 32px`, centered
- Header: Managed by TopBar artifact-zone — icons: ExternalLink, Download, MoreHorizontal, Maximize2, X close
- Title: `fontSize: 24px`, `fontWeight: 600`
- Subtitle: `fontSize: 13px`, `color: var(--muted-foreground)`
- Description: `fontSize: 14px`, `color: var(--muted-foreground)`, `lineHeight: 1.6`
- Action items: list with status icon (✅ green check / ⭕ pending circle), title + detail, time on right, chevron `>`
- Pending items: orange "aguardando você" badge
- Share footer: "Compartilhar" label + WhatsApp/E-mail/Slack icon buttons with borders
- **ContentBlock** (copy-on-hover): `borderRadius: 12px`, `padding: 14px 16px`, monospace font, copy button on hover
- **ContentSection**: section title `12px/500 weight` + list of ContentBlocks, `marginBottom: 28px`

### Prototype Source Files Reference

| Prototype File                                 | Purpose                                          |
| ---------------------------------------------- | ------------------------------------------------ |
| `src/pages/NewChatPage.tsx`                    | Empty state + message handling                   |
| `src/components/chat/SimpleChatLayout.tsx`     | 2-panel (chat + artifact) with draggable divider |
| `src/components/chat/ChatPageLayout.tsx`       | 3-panel (task + chat + artifact)                 |
| `src/components/chat/ActionChatContent.tsx`    | Core chat + artifact renderer                    |
| `src/components/chat/AgentMessage.tsx`         | AI message bubble                                |
| `src/components/chat/UserBubble.tsx`           | User message bubble                              |
| `src/components/chat/ContinueWith.tsx`         | Follow-up suggestion links                       |
| `src/components/chat/ChatInput.tsx`            | Bottom-pinned input                              |
| `src/components/chat/TypingIndicator.tsx`      | Typing dots animation                            |
| `src/components/chat/chatStyles.ts`            | Shared label styles                              |
| `src/components/ChatArtifactPanel.tsx`         | Artifact wrapper with skeleton                   |
| `src/components/artifact/OpsPilotArtifact.tsx` | Daily summary artifact                           |
| `src/components/artifact/ContentBlock.tsx`     | Copyable content blocks                          |
| `src/components/TopBar.tsx`                    | Chat-specific 2-zone header                      |
| `src/contexts/ChatContext.tsx`                 | Chat state bridge (title, artifact, width)       |
| `src/data/actionChatData.ts`                   | Mock chat data per action ID                     |

---

### User Story 5 - Daily Summary Artifact (Priority: P2)

When opening a new chat and there are recent autonomous actions, the artifact panel auto-opens with a "daily summary" showing what Snew did today.

**Acceptance Scenarios**:

1. **Given** the user opens `/chat`, **When** there are recent actions (mock), **Then** the artifact panel auto-opens with "O que o Snew fez hoje".
2. **Given** the daily summary is shown, **When** it lists completed and pending actions, **Then** each item shows status icon, title, skill name, metric, and timestamp.

**Mock daily summary data**:

```ts
const DAILY_SUMMARY = {
  title: 'O que o Snew fez hoje',
  subtitle: 'Segunda-feira · 4 ações executadas · 1 aguardando você',
  items: [
    {
      status: 'done',
      title: 'Reposição aprovada: Body Comfy · 50 unidades',
      skill: 'Inventory Manager',
      metric: 'Evitou ruptura R$ 8.600',
      time: '07:02',
    },
    {
      status: 'done',
      title: 'E-mail VIP Dia das Mães · 847 contatos',
      skill: 'Copywriter',
      metric: 'Receita estimada R$ 12.400',
      time: '07:15',
    },
    {
      status: 'done',
      title: 'Review negativo respondido · Google',
      skill: 'Post-Purchase',
      metric: 'NPS protegido',
      time: '07:18',
    },
    {
      status: 'done',
      title: 'Sequência WhatsApp ativada · 4 clientes VIP',
      skill: 'Retention Engine',
      metric: 'LTV R$ 4.200 em risco',
      time: '07:20',
    },
    {
      status: 'pending',
      title: 'Publicar Reels emocional · aprovação necessária',
      skill: 'Video Script Creator',
      metric: 'Alcance estimado 8.400',
      badge: 'aguardando você',
    },
  ],
}
```

---

## 3-Panel Layout Architecture (from prototype)

The prototype uses a **3-column layout** with draggable splits:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Sidebar │ TopBar: task-zone │ TopBar: chat-zone │ TopBar: artifact-zone │
│  56px   ├───────────────────┼───────────────────┼──────────────────────│
│         │ TaskListPanel     │ Chat messages      │ Artifact content     │
│         │ (collapsible)     │ (scrollable)       │ (scrollable)         │
│         │ ~30% default      │                    │ bg: var(--muted)     │
│         │                   │                    │ borderLeft           │
│         │ [drag handle]     │ [drag handle 8px]  │                      │
│         │                   ├────────────────────┤                      │
│         │                   │ ChatInput (pinned) │                      │
└─────────┴───────────────────┴────────────────────┴──────────────────────┘
```

**For Phase 1 (this spec), we simplify to 2 panels**: Chat + Artifact only. The TaskListPanel is **out of scope** (can be added later).

- **Without artifact**: Chat takes full width (minus sidebar)
- **With artifact**: Chat ~50%, Artifact ~50%, **draggable divider** between them
- **Width persistence**: `localStorage` key `"snew-chat-width"` for split position
- **Artifact state**: Managed via ChatContext, toggled by header button or auto-open
- **TopBar 2-zone**: On chat routes, the TopBar becomes chat-specific with title + actions + artifact controls

### ChatContext State (from prototype)

```ts
interface ChatContextState {
  chatTitle: string
  artifactState: { open: boolean; level: number; title: string; parentTitle?: string }
  onCloseArtifact: () => void
  onReopenArtifact: () => void
  chatWidthPx: number
}
```

The TopBar reads from ChatContext to render the correct header for chat routes.

---

## Component Mapping (Current → New)

| Current Component                        | Action      | New Component                                    |
| ---------------------------------------- | ----------- | ------------------------------------------------ |
| `src/app/(dashboard)/chat/page.tsx`      | **Rewrite** | New chat page with 2-panel layout                |
| `src/app/(dashboard)/chat/[id]/page.tsx` | **Keep**    | Existing conversation page (update layout)       |
| N/A                                      | **Create**  | `src/components/chat/chat-empty-state.tsx`       |
| N/A                                      | **Create**  | `src/components/chat/chat-message.tsx`           |
| N/A                                      | **Create**  | `src/components/chat/chat-continue-with.tsx`     |
| N/A                                      | **Create**  | `src/components/chat/chat-header.tsx`            |
| N/A                                      | **Create**  | `src/components/chat/chat-input.tsx`             |
| N/A                                      | **Create**  | `src/components/chat/artifact-panel.tsx`         |
| N/A                                      | **Create**  | `src/components/chat/daily-summary-artifact.tsx` |

---

## Files to Create/Modify

### New Files

1. `src/components/chat/chat-empty-state.tsx` — Empty state with Snew avatar + suggestions
2. `src/components/chat/chat-message.tsx` — Message bubble with BubbleAvatar + "Continue with"
3. `src/components/chat/chat-continue-with.tsx` — Suggestion links below messages
4. `src/components/chat/chat-header.tsx` — Chat-specific header with title + actions
5. `src/components/chat/chat-input.tsx` — Bottom-pinned input ("Ask Snew anything...")
6. `src/components/chat/artifact-panel.tsx` — Collapsible right side panel
7. `src/components/chat/daily-summary-artifact.tsx` — Daily summary content for artifact

### Modified Files

8. `src/app/(dashboard)/chat/page.tsx` — New 2-panel layout
9. `src/components/dashboard-shell-new.tsx` — Conditionally hide global TopBar on chat routes (chat has own header)

---

## Non-Functional Requirements

- **Chat must remain functional** — uses existing `/api/chat` orchestrator endpoint, `useChat` from AI SDK
- **Artifact content is mock** — hardcoded daily summary, calendar, action items
- **No new API routes** — all artifact data is client-side mock
- **Responsive**: Artifact panel collapses on narrow viewports
- **Scroll**: Chat and artifact panels scroll independently
- **Animation**: Smooth panel open/close transition

---

## Out of Scope

- Real artifact data from API/database
- Artifact editing or interaction (approve, reject actions)
- Multiple artifact types (only daily summary and generic list for now)
- Chat history list/sidebar
- File attachments in chat input
- Sharing functionality (WhatsApp/Email/Slack buttons are visual-only)
- Task management ("Tarefa" button is visual-only)
