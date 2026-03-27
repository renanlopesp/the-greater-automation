# Contract: SkillWorkspace Component

## Props Interface

```typescript
interface SkillWorkspaceProps {
  /** Skill metadata for the top bar */
  skill: {
    name: string
    emoji: string
    status: 'active' | 'available'
  }
  /** Hero card rendered in the chat panel when no messages exist */
  heroCard?: React.ReactNode
  /** Quick action suggestions shown before first message */
  quickActions?: Array<{ label: string; message: string }>
  /** Artifact content rendered in the right panel */
  artifactContent?: React.ReactNode
  /** Chat input placeholder text */
  inputPlaceholder?: string
  /** Called when user sends a message */
  onSendMessage?: (message: string) => void
}
```

## Artifact Navigation Context

```typescript
interface ArtifactNavState {
  /** Stack of navigation levels, each with a label for the back button */
  stack: Array<{ level: number; label: string }>
  /** Push a new level onto the stack */
  push: (label: string) => void
  /** Pop the top level (go back) */
  pop: () => void
  /** Reset to level 0 (close artifact or go to root) */
  reset: () => void
  /** Current depth (0 = root/closed, 1 = level 1, etc.) */
  depth: number
}
```

## Keyboard Shortcuts

| Shortcut        | Action                           |
| --------------- | -------------------------------- |
| Cmd+\ / Ctrl+\  | Toggle artifact panel open/close |
