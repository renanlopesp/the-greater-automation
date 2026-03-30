# Implementation Plan: Chat with Artifact Side Panel

**Branch**: `feat/chat-artifact-panel` | **Date**: 2026-03-30 | **Spec**: [spec.md](./spec.md)

## Summary

Redesign the chat page with a Perplexity-style 2-panel layout: chat conversation on the left, collapsible artifact panel on the right with draggable divider. Chat remains fully functional (existing `/api/chat` endpoint). Artifact content and daily summary are mock data. New chat empty state with Snew avatar and suggestion prompts.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK (`useChat`), framer-motion, lucide-react
**Storage**: N/A (artifact data is mock; chat uses existing `/api/chat`)
**Testing**: Visual comparison with prototype
**Target Platform**: Web (desktop-first)
**Project Type**: Web application (Next.js App Router)

## Constitution Check

| Principle                | Status   | Notes                                                               |
| ------------------------ | -------- | ------------------------------------------------------------------- |
| I. App Router First      | **PASS** | Chat pages in `src/app/(dashboard)/chat/`                           |
| II. shadcn/ui            | **PASS** | Custom chat components needed, but DropdownMenu/Tooltip from shadcn |
| III. Tailwind + CSS vars | **PASS** | All colors via CSS variables                                        |
| IV. TypeScript Strict    | **PASS** | ChatContext, ArtifactState types defined                            |
| V. Simplicity/YAGNI      | **PASS** | No TaskListPanel (Phase 2). Mock artifacts.                         |
| VI. Supabase             | **N/A**  | Chat uses existing API, no new tables                               |

## Architecture

### Component Hierarchy

```
DashboardShellNew
├── Sidebar (unchanged)
├── ChatHeader (replaces TopBar on /chat routes)
│   ├── Chat zone: title + actions + share
│   └── Artifact zone: external/download/more/maximize/close
└── <main>
    └── ChatPage (/chat)
        └── ChatLayout (flex, draggable split)
            ├── ChatPanel (left, scrollable)
            │   ├── ChatEmptyState (when no messages)
            │   │   ├── ChatAvatar (44px, pulse)
            │   │   ├── Heading + subtitle
            │   │   └── Suggestion chips (4)
            │   ├── Messages (when conversation active)
            │   │   ├── ChatMessage (agent: avatar + text)
            │   │   ├── ChatMessage (user: right-aligned bubble)
            │   │   ├── ContinueWith (↳ suggestions)
            │   │   └── TypingIndicator (3 dots)
            │   └── ChatInput (pinned bottom, borderRadius 28)
            ├── DragHandle (8px, cursor col-resize)
            └── ArtifactPanel (right, collapsible)
                └── DailySummaryArtifact (mock content)
```

### State Management

```
ChatContext (React Context)
├── chatTitle: string
├── artifactOpen: boolean
├── onCloseArtifact: () => void
├── onReopenArtifact: () => void
└── chatWidthPx: number (persisted to localStorage)

useChat (Vercel AI SDK) — existing /api/chat endpoint
├── messages, input, handleSubmit, isLoading
└── Streaming responses
```

## Phases

### Phase 1: Chat Context & Layout Shell

1. Create ChatContext provider
2. Create ChatLayout with draggable split (chat left, artifact right)
3. Create ChatHeader (chat-specific top bar)

### Phase 2: Empty State & Input

4. Create ChatEmptyState (avatar + heading + chips)
5. Create ChatInput (borderRadius 28, auto-resize, send button)

### Phase 3: Messages & Conversation

6. Create ChatMessage (agent bubble + user bubble)
7. Create ContinueWith (↳ suggestions)
8. Create TypingIndicator
9. Wire up useChat with existing /api/chat

### Phase 4: Artifact Panel

10. Create ArtifactPanel shell (collapsible, bg muted, borderLeft)
11. Create DailySummaryArtifact (mock content)
12. Wire artifact open/close to ChatContext + header toggle

### Phase 5: Page Integration & QA

13. Rewrite /chat page with new layout
14. Update DashboardShellNew to swap header on chat routes
15. Visual QA vs prototype
