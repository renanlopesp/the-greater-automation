# Data Model: Layout Redesign & Full Page Conversion

**Date**: 2026-03-10 | **Branch**: `031-layout-redesign`

## Overview

This feature introduces no new database tables. All new data is static/mock, defined as TypeScript files in `src/data/`. Existing Supabase tables remain unchanged.

## Static Data Entities

### Agent (Co-worker)

Source: `src/data/agents.ts`

```typescript
interface Agent {
  id: string // kebab-case identifier (e.g., "customer-service")
  name: string // Display name (e.g., "Customer Service")
  category: AgentCategory // One of 7 categories
  description: string // Short description (~1 sentence)
  detailedDescription: string // Extended description (~2-3 sentences)
  tools: string[] // Connected integrations (e.g., ["Shopify", "Gmail"])
  tags: string[] // Searchable keywords
  status?: 'active' | 'inactive' // Runtime status
}

type AgentCategory =
  | 'Customer Service'
  | 'Marketing'
  | 'Competitors'
  | 'Analytics'
  | 'Audit'
  | 'Productivity'
```

**Count**: 27 agents across 7 categories.
**Relationships**: Agents appear on Home (co-workers in action), Discover (full catalog), Agent Workspace (detail), Notifications (source badge).

### Coworker (Chat Selector)

Source: `src/data/coworkers.ts`

```typescript
interface Coworker {
  id: string
  name: string
  emoji: string // Category emoji indicator
  category: string
  description: string
  prompts: string[] // Suggested questions (5 per coworker)
}
```

**Count**: 25 coworkers (subset of agents with chat-specific data).
**Relationships**: Used in New Chat page co-worker selector chips and prompt suggestions.

### App Integration

Source: `src/data/apps.ts`

```typescript
interface AppIntegration {
  id: string
  name: string // e.g., "Shopify", "Gmail"
  emoji: string // e.g., "🛍", "✉️"
  connected: boolean // Connection status
}
```

**Count**: 12 apps.
**Relationships**: Displayed on Apps page. Connected apps referenced in Agent Workspace channels list.

### Notification

Source: `src/data/notifications.ts`

```typescript
interface Notification {
  id: string
  agentName: string // Source co-worker
  category: AgentCategory // Category for badge color
  title: string
  description: string
  urgency: 'urgent' | 'opportunity' | 'insight'
  read: boolean
  createdAt: string // ISO date string
}
```

**Relationships**: Displayed on Notifications page (New/Earlier). Badge count shown in TopBar bell icon.

### Conversation (Chat History)

Source: `src/data/conversations.ts` (mock) or existing Supabase `agent_conversations`

```typescript
interface Conversation {
  id: string
  title: string
  createdAt: string // ISO date string
  messages: Message[]
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentName?: string // For assistant messages
  timestamp: string
}
```

**Relationships**: Listed on History page, individual view at Chat/[id]. Messages rendered in message thread.

### Activity Log Entry

Source: Inline mock data in Agent Workspace components

```typescript
interface ActivityEntry {
  id: string
  problem: string // What was detected
  suggestedAction: string // Recommended response
  priority: 'High' | 'Medium' | 'Low'
  status: 'Pending' | 'In Progress' | 'Done'
  timestamp?: string
}
```

**Relationships**: Displayed in Agent Workspace left panel and Installed Agent action log tab.

### Home Dashboard Data

Source: Inline mock data in Home components

```typescript
interface MetricCard {
  label: string // e.g., "Agentes ativos agora"
  value: string // e.g., "3", "R$4.200"
  subtitle: string // e.g., "Live", "↑ +18% vs. semana passada"
  isLive?: boolean // Triggers conic-gradient animation
}

interface Opportunity {
  id: string
  agentName: string
  agentIcon: string
  description: string
  impact: string // e.g., "~R$3.200", "Risco alto"
  ctaLabel: string // e.g., "Agir →", "Ver análise →"
}

interface CoworkerInAction {
  agentId: string
  name: string
  status: 'active' | 'inactive'
  recentResult: string
  description: string
}
```

## Translation Keys

Source: `src/contexts/language-context.tsx`

```typescript
type Language = 'en' | 'pt-BR'

interface Translations {
  [key: string]: string // 100+ keys covering all UI surfaces
}
```

**Storage**: In-memory object within LanguageContext. Language preference in localStorage (`app_language` key).

## State Management

| State                   | Storage                            | Scope              |
| ----------------------- | ---------------------------------- | ------------------ |
| Language preference     | localStorage (`app_language`)      | Global, persistent |
| Sidebar collapsed       | localStorage (`sidebar_collapsed`) | Global, persistent |
| Notification read state | Component state (mock)             | Session only       |
| Search/filter inputs    | Component state                    | Per-page           |
| Active category tab     | Component state / URL param        | Per-page           |

## Future Integration Points

These static data entities map to existing or planned Supabase tables:

| Static Entity   | Future Supabase Table                    | Notes                                    |
| --------------- | ---------------------------------------- | ---------------------------------------- |
| Agent           | `agents`                                 | Already exists — can replace static data |
| Conversation    | `agent_conversations` + `agent_messages` | Already exists                           |
| App Integration | `app_connections`                        | Already exists                           |
| Notification    | New table needed                         | Future feature                           |
| Activity Log    | `agent_workflow_runs` + steps            | Partial match                            |
