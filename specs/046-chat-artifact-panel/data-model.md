# Data Model: Chat with Artifact Side Panel

> **Note**: Chat messages use the existing `/api/chat` endpoint (Vercel AI SDK `useChat`). Artifact content is entirely mock. No new database tables.

## Types

### ChatContextState

```ts
interface ChatContextState {
  chatTitle: string
  setChatTitle: (title: string) => void
  artifactOpen: boolean
  setArtifactOpen: (open: boolean) => void
  onCloseArtifact: () => void
  onReopenArtifact: () => void
  chatWidthPx: number
  setChatWidthPx: (px: number) => void
}
```

### ArtifactState (future expansion)

```ts
interface ArtifactState {
  open: boolean
  level: number // drill-down depth (1 = top, 2+ = detail)
  title: string
  parentTitle?: string // breadcrumb when level >= 2
}
```

### DailySummaryItem

```ts
interface DailySummaryItem {
  id: string
  status: 'done' | 'pending'
  title: string
  skill: string
  metric: string
  time?: string // e.g., "07:02"
  badge?: string // e.g., "aguardando você"
}
```

### ContinueWithItem

```ts
// Simple string array — each item is the text to send as a message
type ContinueWithItems = string[]
```

### ChatMessage (from Vercel AI SDK)

```ts
// Already defined by @ai-sdk/react
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}
```

## No Database Changes

This feature does not create, modify, or query any new database tables. Chat messages flow through the existing `/api/chat` route handler.
