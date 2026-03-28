# Contract: Skill Chat Integration

**Feature**: 044-seasonal-calendar-ai
**Date**: 2026-03-27

## Hook: `useSkillChat(skillSlug: string)`

Wrapper over `useOrchestratorChat` that adds skill context to every message.

### Interface

```typescript
function useSkillChat(skillSlug: string): {
  messages: UIMessage[]
  status: 'idle' | 'submitted' | 'streaming'
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  conversationId: string | null
  sendMessage: (text: string) => Promise<void>
  startNewChat: () => void
  stop: () => void
}
```

### Behavior

1. Internally uses `useOrchestratorChat()` with a custom transport that injects `{ skillContext: skillSlug }` in the request body
2. The orchestrator `/api/chat` endpoint reads `skillContext` and adjusts its system prompt to include seasonal calendar context
3. Quick action pills call `sendMessage(pillText)` — no special handling needed
4. Chat state persists across artifact navigation (messages survive level changes)

### Transport Modification

The existing `DefaultChatTransport` body callback will include:

```typescript
body: () => ({
  conversationId: conversationIdRef.current,
  skillContext: skillSlug, // NEW — tells orchestrator which skill is active
})
```

### Orchestrator Side

The `/api/chat/route.ts` already loads skill data. When `skillContext` is present in the body:

- Include the skill's system prompt in the AI context
- Provide the skill's tools for the AI to use
- The orchestrator can invoke `SNEW_RUN_SKILL` for the seasonal calendar if the user asks to generate

No changes to the orchestrator route are required — it already supports skill-aware context via `SNEW_RUN_SKILL` and `SNEW_GET_SKILL` tools.

---

## SkillWorkspace Chat Props

The `SkillWorkspace` component will accept chat-related props:

```typescript
interface SkillWorkspaceProps {
  // Existing props
  skillName: string
  skillEmoji: string
  heroCard: React.ReactNode
  artifactContent: React.ReactNode
  quickActions: Array<{ label: string; message: string }>

  // NEW — Chat integration
  messages: UIMessage[]
  isLoading: boolean
  isStreaming: boolean
  onSendMessage: (text: string) => Promise<void>
  onStopStreaming?: () => void
}
```

This replaces the internal static message state in `skill-workspace.tsx` with externally controlled chat state.

---

## Quick Actions

Predefined for the seasonal calendar skill:

```typescript
const quickActions = [
  {
    label: 'Qual a proxima data importante?',
    message: 'Qual a próxima data sazonal importante para minha loja?',
  },
  {
    label: 'Gerar briefing Dia das Mães',
    message: 'Gere um briefing completo de campanha para o Dia das Mães',
  },
  {
    label: 'Mostrar calendário completo',
    message: 'Me mostre uma visão geral do calendário sazonal com todas as datas',
  },
]
```

These are passed as props to `SkillWorkspace` and rendered as clickable pills in the empty chat state.
