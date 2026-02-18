# Implementation Plan: Shared Agent Chat & Team App Connections

**Branch**: `026-shared-agent-chat` | **Date**: 2026-02-18 | **Spec**: `specs/026-shared-agent-chat/spec.md`

## Summary

Transform agent conversations from per-user isolation to team-shared threads. Add message attribution (sender name/avatar), conversation history browser, shared app connections for agent workflows, and real-time sync via Supabase Realtime. This requires DB schema changes, RLS policy updates, API route modifications, new UI components, and a data migration.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Supabase (@supabase/ssr, Realtime), Vercel AI SDK, Composio SDK, TanStack React Query, Zustand
**Storage**: Supabase PostgreSQL (production: `djohaxwfketlsjurwqne`, test: `ejqumzvclfkbbzzdvmmi`)
**Testing**: Vitest + @testing-library/react + happy-dom (unit), Playwright (E2E)
**Target Platform**: Web (Next.js App Router, Server Components + Client Components)
**Performance Goals**: Real-time message delivery <2s, history browser load <1s
**Constraints**: Must not break existing agent chat UX, must migrate existing data losslessly
**Scale/Scope**: ~15 files modified, ~8 new files, 5 DB migrations

---

## Phase 1: Database Schema Changes

### Migration 1: Add `sender_id` to `agent_messages`

```sql
ALTER TABLE agent_messages ADD COLUMN sender_id UUID REFERENCES auth.users(id);

-- Backfill: attribute existing user messages to their conversation owner
UPDATE agent_messages m
SET sender_id = c.user_id
FROM agent_conversations c
WHERE m.conversation_id = c.id AND m.role = 'user';
```

### Migration 2: Make `agent_conversations` team-scoped

Remove the per-user constraint. Add `created_by` to track who started the conversation, and `is_active` flag for the "current" conversation.

```sql
-- Add created_by column (who started this conversation)
ALTER TABLE agent_conversations ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Backfill created_by from existing user_id
UPDATE agent_conversations SET created_by = user_id;

-- Add is_active flag (only one active conversation per agent)
ALTER TABLE agent_conversations ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;

-- Mark the most recent conversation per agent as active
UPDATE agent_conversations ac SET is_active = true
WHERE ac.id = (
  SELECT id FROM agent_conversations
  WHERE agent_id = ac.agent_id
  ORDER BY updated_at DESC LIMIT 1
);

-- Drop the user_id column (conversations are now team-scoped, not user-scoped)
-- Note: Keep user_id temporarily for backward compat, drop in a later migration
ALTER TABLE agent_conversations ALTER COLUMN user_id DROP NOT NULL;
```

### Migration 3: Update RLS policies for shared access

```sql
-- DROP old per-user policies
DROP POLICY IF EXISTS "Users can insert their own conversations" ON agent_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON agent_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON agent_conversations;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON agent_messages;
DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON agent_messages;

-- NEW: Team members can INSERT conversations for their agents
CREATE POLICY "Team members can create conversations"
ON agent_conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents a
    JOIN team_members tm ON tm.team_id = a.team_id
    WHERE a.id = agent_conversations.agent_id AND tm.user_id = auth.uid()
  )
);

-- NEW: Team members can UPDATE conversations for their agents
CREATE POLICY "Team members can update conversations"
ON agent_conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM agents a
    JOIN team_members tm ON tm.team_id = a.team_id
    WHERE a.id = agent_conversations.agent_id AND tm.user_id = auth.uid()
  )
);

-- NEW: Owners/admins can DELETE conversations
CREATE POLICY "Owners and admins can delete conversations"
ON agent_conversations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM agents a
    JOIN team_members tm ON tm.team_id = a.team_id
    WHERE a.id = agent_conversations.agent_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

-- NEW: Team members can INSERT messages in team conversations
CREATE POLICY "Team members can send messages"
ON agent_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_conversations ac
    JOIN agents a ON a.id = ac.agent_id
    JOIN team_members tm ON tm.team_id = a.team_id
    WHERE ac.id = agent_messages.conversation_id AND tm.user_id = auth.uid()
  )
);

-- NEW: Owners/admins can DELETE messages
CREATE POLICY "Owners and admins can delete messages"
ON agent_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM agent_conversations ac
    JOIN agents a ON a.id = ac.agent_id
    JOIN team_members tm ON tm.team_id = a.team_id
    WHERE ac.id = agent_messages.conversation_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);
```

### Migration 4: Add `agent_messages` to Realtime publication

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE agent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_conversations;
```

### Migration 5: Shared app connections view for agents

Create a helper function to get app connections available for an agent (owner's connections used in workflows + the current user's own connections).

```sql
CREATE OR REPLACE FUNCTION get_agent_available_connections(p_agent_id UUID, p_user_id UUID)
RETURNS TABLE (
  app_id TEXT,
  connection_user_id UUID,
  is_own_connection BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- User's own connections (highest priority)
  SELECT ac.app_id, ac.user_id AS connection_user_id, true AS is_own_connection
  FROM app_connections ac
  WHERE ac.user_id = p_user_id
    AND ac.status = 'connected'

  UNION ALL

  -- Team owner/admin connections used in agent workflows (shared)
  SELECT DISTINCT ac.app_id, ac.user_id AS connection_user_id, false AS is_own_connection
  FROM app_connections ac
  JOIN agents a ON a.team_id = ac.team_id
  JOIN team_members tm ON tm.team_id = a.team_id AND tm.user_id = ac.user_id
  WHERE a.id = p_agent_id
    AND ac.status = 'connected'
    AND ac.user_id != p_user_id
    AND tm.role IN ('owner', 'admin')
  ORDER BY is_own_connection DESC;
END;
$$;
```

**Files to create:**

- `supabase/migrations/YYYYMMDD_add_sender_id_to_agent_messages.sql`
- `supabase/migrations/YYYYMMDD_make_conversations_team_scoped.sql`
- `supabase/migrations/YYYYMMDD_update_chat_rls_policies.sql`
- `supabase/migrations/YYYYMMDD_add_chat_to_realtime_publication.sql`
- `supabase/migrations/YYYYMMDD_shared_agent_connections_function.sql`

---

## Phase 2: API Route Changes

### Update `POST /api/agents/[id]/chat`

**File**: `src/app/api/agents/[id]/chat/route.ts`

Key changes:

1. **Conversation lookup**: Instead of finding the user's latest conversation, find the agent's active conversation (`is_active = true`).
2. **Message insertion**: Add `sender_id: user.id` to the INSERT on `agent_messages`.
3. **App connections**: Use `get_agent_available_connections(agentId, userId)` RPC instead of filtering by `user_id` only. When building Composio tools, pass the appropriate `entity_id` (user's own if available, otherwise the connection owner's).
4. **New conversation creation**: Set `created_by: user.id` and `is_active: true`. Unset `is_active` on the previous active conversation.
5. **Active conversation switching**: When `is_active` changes, broadcast via Realtime (the DB trigger handles this automatically since we added the table to supabase_realtime).

### New: `GET /api/agents/[id]/conversations`

**File**: `src/app/api/agents/[id]/conversations/route.ts` (new)

Returns paginated list of conversations for an agent:

```typescript
{
  conversations: {
    id: string
    title: string
    createdBy: { id: string, fullName: string, avatarUrl: string }
    createdAt: string
    updatedAt: string
    isActive: boolean
    messageCount: number
    participants: { id: string, fullName: string, avatarUrl: string }[]
  }[]
  hasMore: boolean
}
```

### New: `POST /api/agents/[id]/conversations/[conversationId]/activate`

**File**: `src/app/api/agents/[id]/conversations/[conversationId]/activate/route.ts` (new)

Switches the active conversation for the agent. Sets the target conversation's `is_active = true` and all others to `false`.

**Files to modify:**

- `src/app/api/agents/[id]/chat/route.ts`

**Files to create:**

- `src/app/api/agents/[id]/conversations/route.ts`
- `src/app/api/agents/[id]/conversations/[conversationId]/activate/route.ts`

---

## Phase 3: Queries & Hooks

### Update conversation queries

**File**: `src/lib/queries/agent-conversations.ts`

- `getActiveConversation(supabase, agentId)` — replaces `getLatestConversation`. No longer filters by `user_id`.
- `getConversationMessages(supabase, conversationId)` — add join to `profiles` to get sender info (fullName, avatarUrl) for each message.

### Update `loadConversationHistory` server action

**File**: `src/lib/actions/agent-conversations.ts`

- Call `getActiveConversation` instead of `getLatestConversation`.
- Return messages with sender info.

### Update `useAgentChat` hook

**File**: `src/hooks/use-agent-chat.ts`

Key changes:

1. **History loading**: Load the active conversation (team-scoped), not the user's personal one.
2. **Real-time subscription**: Subscribe to `agent_messages` INSERT events filtered by `conversation_id`. When a new message arrives from another user, append it to the local message list.
3. **Conversation switch**: Subscribe to `agent_conversations` UPDATE events. When `is_active` changes, reload the conversation.
4. **Message format**: Include sender info (`senderName`, `senderAvatar`, `senderId`) in message metadata.

### New: `useConversationHistory` hook

**File**: `src/hooks/use-conversation-history.ts` (new)

- Fetches paginated conversation list via `GET /api/agents/[id]/conversations`.
- Supports switching active conversation.
- Uses TanStack React Query for caching.

### New: `useAgentPresence` hook (P3)

**File**: `src/hooks/use-agent-presence.ts` (new)

- Uses Supabase Realtime Presence to track who is viewing the agent chat.
- Returns list of currently active users.

**Files to modify:**

- `src/lib/queries/agent-conversations.ts`
- `src/lib/actions/agent-conversations.ts`
- `src/hooks/use-agent-chat.ts`

**Files to create:**

- `src/hooks/use-conversation-history.ts`
- `src/hooks/use-agent-presence.ts`

---

## Phase 4: Chat UI — Message Attribution

### Update `ChatPanel`

**File**: `src/components/agent-detail/chat-panel.tsx`

Key changes:

1. **Message bubbles**: For `role === 'user'` messages, show the sender's avatar and name above/beside the message. Use metadata `senderId`, `senderName`, `senderAvatar`.
2. **Message grouping**: Consecutive messages from the same sender don't repeat the avatar/name — just show it on the first message of a group.
3. **Current user distinction**: Messages from the current user align right (as today). Messages from other team members align left with their identity shown (like agent messages but with different styling).
4. **Streaming indicator**: Show "Agent is typing..." or a typing indicator when the agent is streaming a response.

### Types update

**File**: `src/types/agent-chat.ts` (new)

```typescript
export interface ChatSender {
  id: string
  fullName: string
  avatarUrl: string | null
}

export interface SharedChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  sender?: ChatSender // Only for role='user'
  createdAt: string
  metadata: Record<string, unknown>
}
```

**Files to modify:**

- `src/components/agent-detail/chat-panel.tsx`

**Files to create:**

- `src/types/agent-chat.ts`

---

## Phase 5: Conversation History Browser UI

### New: `ConversationHistoryPanel`

**File**: `src/components/agent-detail/conversation-history-panel.tsx` (new)

- Slide-out panel or sidebar showing past conversations.
- Each row: conversation title, created by (avatar + name), date, participant avatars, message count.
- Click to switch active conversation.
- "New Chat" button at the top.
- Active conversation highlighted.

### Update agent detail page

**File**: `src/app/(dashboard)/agents/[id]/page.tsx`

- Add "Chat History" button in the chat header area.
- Toggle the conversation history panel.
- Wire up conversation switching.

**Files to create:**

- `src/components/agent-detail/conversation-history-panel.tsx`

**Files to modify:**

- `src/app/(dashboard)/agents/[id]/page.tsx`

---

## Phase 6: Shared App Connections

### Update chat API for shared connections

**File**: `src/app/api/agents/[id]/chat/route.ts`

- Replace direct `app_connections` query with RPC call to `get_agent_available_connections`.
- When building Composio tools, determine which `entity_id` to use: prefer user's own connection, fall back to shared owner connection.

### Update agent detail page — show shared connections

**File**: `src/app/(dashboard)/agents/[id]/page.tsx`

- Add "Connected Apps" section showing which apps are available for this agent.
- Show connection owner's avatar for shared connections.
- "Connect your own" button for apps the user hasn't connected.

**Files to modify:**

- `src/app/api/agents/[id]/chat/route.ts`
- `src/app/(dashboard)/agents/[id]/page.tsx`

---

## Phase 7: Testing

### Unit Tests (Vitest)

- `src/hooks/__tests__/use-agent-chat.test.ts` — Update existing tests for shared conversation model, add real-time subscription tests.
- `src/hooks/__tests__/use-conversation-history.test.ts` — New: pagination, conversation switching.
- `src/components/agent-detail/__tests__/chat-panel.test.tsx` — Update for message attribution, multi-user messages.
- `src/components/agent-detail/__tests__/conversation-history-panel.test.tsx` — New: history list rendering, click to switch.
- `src/lib/queries/__tests__/agent-conversations.test.ts` — Update for team-scoped queries.

### E2E Tests (Playwright)

- Multi-user chat flow (simulated): User A sends message, verify it appears with attribution.
- Conversation history: Create multiple chats, browse history, switch between them.
- New chat creation: Verify both users see the new empty conversation.

---

## Existing Utilities to Reuse

| Utility                             | File                                         | Use                               |
| ----------------------------------- | -------------------------------------------- | --------------------------------- |
| `createServiceRoleClient()`         | `src/lib/supabase/server.ts:47`              | Migration backfill, bypassing RLS |
| `getActiveTeamId()`                 | `src/lib/get-active-team.ts`                 | Resolve current workspace         |
| `getUserTeamRole()`                 | `src/lib/auth/require-role.ts`               | Auth + role checks in API routes  |
| `get_user_team_ids()`               | SQL function                                 | RLS policy helper                 |
| `BoringAvatar`                      | `src/components/agent-detail/chat-panel.tsx` | Agent avatar in messages          |
| `Avatar/AvatarImage/AvatarFallback` | `src/components/ui/avatar.tsx`               | User avatar in messages           |
| Supabase Realtime                   | Already used for notifications               | Pattern for message subscriptions |

---

## Migration Strategy

1. Apply migrations in order (sender_id → team-scoped → RLS → realtime → connections function).
2. Backfill `sender_id` on existing messages from conversation's `user_id`.
3. Set most recent conversation per agent as `is_active`.
4. Existing per-user conversations become visible to all team members (RLS change).
5. No data loss — all existing messages preserved with correct attribution.

## Verification

1. **Shared chat**: User A sends message → User B sees it in real-time.
2. **Attribution**: Every user message shows sender name + avatar.
3. **History**: Can browse and switch between past conversations.
4. **New chat**: Creates new active conversation, all users switch.
5. **Shared connections**: Agent can use owner's app connections for team members.
6. **Connection priority**: User's own connection used over shared when both exist.
7. **RLS**: Team members can read/write; non-members blocked.
8. **Migration**: Existing data preserved with correct attribution.
9. **Build**: `bun run build` passes.
10. **Tests**: All existing + new tests pass.

## Source Code Structure

```text
src/
├── app/
│   ├── (dashboard)/agents/[id]/page.tsx              # Modified: history button, shared connections
│   └── api/agents/[id]/
│       ├── chat/route.ts                              # Modified: shared model, sender_id, connections
│       └── conversations/
│           ├── route.ts                               # New: list conversations
│           └── [conversationId]/activate/route.ts     # New: switch active conversation
├── components/agent-detail/
│   ├── chat-panel.tsx                                 # Modified: message attribution, multi-user
│   └── conversation-history-panel.tsx                 # New: history browser
├── hooks/
│   ├── use-agent-chat.ts                              # Modified: shared model, realtime
│   ├── use-conversation-history.ts                    # New: history fetching
│   └── use-agent-presence.ts                          # New: P3 presence
├── lib/
│   ├── queries/agent-conversations.ts                 # Modified: team-scoped queries
│   └── actions/agent-conversations.ts                 # Modified: shared loading
├── types/
│   └── agent-chat.ts                                  # New: shared chat types
└── supabase/migrations/
    ├── YYYYMMDD_add_sender_id_to_agent_messages.sql
    ├── YYYYMMDD_make_conversations_team_scoped.sql
    ├── YYYYMMDD_update_chat_rls_policies.sql
    ├── YYYYMMDD_add_chat_to_realtime_publication.sql
    └── YYYYMMDD_shared_agent_connections_function.sql
```
