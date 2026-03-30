# Component Contracts: Chat with Artifact Side Panel

## New Components

### `src/contexts/chat-context.tsx`

```ts
export interface ChatContextState {
  chatTitle: string
  setChatTitle: (title: string) => void
  artifactOpen: boolean
  setArtifactOpen: (open: boolean) => void
  chatWidthPx: number
  setChatWidthPx: (px: number) => void
}

export function ChatContextProvider({ children }: { children: ReactNode }): JSX.Element
export function useChatContext(): ChatContextState
```

### `src/components/chat/chat-layout.tsx`

```ts
interface ChatLayoutProps {
  chatContent: ReactNode
  artifactContent: ReactNode | null
}

// "use client" — draggable split panel
export default function ChatLayout(props: ChatLayoutProps): JSX.Element
```

### `src/components/chat/chat-header.tsx`

```ts
// "use client" — reads ChatContext for title + artifact state
// No props — self-contained, reads from context
export default function ChatHeader(): JSX.Element
```

### `src/components/chat/chat-empty-state.tsx`

```ts
interface ChatEmptyStateProps {
  onSendMessage: (text: string) => void
}

export default function ChatEmptyState(props: ChatEmptyStateProps): JSX.Element
```

### `src/components/chat/chat-input.tsx`

```ts
interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

// "use client" — textarea state + auto-resize
export default function ChatInput(props: ChatInputProps): JSX.Element
```

### `src/components/chat/chat-message.tsx`

```ts
interface ChatMessageProps {
  role: 'assistant' | 'user'
  content: string
}

export default function ChatMessage(props: ChatMessageProps): JSX.Element
```

### `src/components/chat/chat-continue-with.tsx`

```ts
interface ContinueWithProps {
  items: string[]
  onSelect: (text: string) => void
}

export default function ContinueWith(props: ContinueWithProps): JSX.Element
```

### `src/components/chat/typing-indicator.tsx`

```ts
// No props
export default function TypingIndicator(): JSX.Element
```

### `src/components/chat/artifact-panel.tsx`

```ts
interface ArtifactPanelProps {
  children: ReactNode
  loading?: boolean
}

// "use client" — AnimatePresence for enter/exit
export default function ArtifactPanel(props: ArtifactPanelProps): JSX.Element
```

### `src/components/chat/daily-summary-artifact.tsx`

```ts
// No props — hardcoded mock data
export default function DailySummaryArtifact(): JSX.Element
```

## Modified Components

### `src/app/(dashboard)/chat/page.tsx`

```ts
// "use client" — owns useChat + ChatContextProvider
// Renders: ChatHeader + ChatLayout(chatContent, artifactContent)
// Chat functional via useChat({ api: '/api/chat' })
export default function ChatPage(): JSX.Element
```

### `src/components/dashboard-shell-new.tsx`

```ts
// Changes: detect /chat route via usePathname()
// If on /chat: hide TopBar (ChatHeader renders inside page)
// If not on /chat: show TopBar as before
```
