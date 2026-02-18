# Tasks: Shared Agent Chat & Team App Connections

**Input**: Design documents from `specs/026-shared-agent-chat/`
**Prerequisites**: plan.md (required), spec.md (required)

---

## Phase 1: Database Migrations (Blocking)

**Purpose**: Schema changes that must be applied before any code changes. All other phases depend on this.

**CRITICAL**: No code changes can begin until all migrations are applied to the test branch.

- [ ] T001 [US1] Create migration `add_sender_id_to_agent_messages.sql` — Add `sender_id UUID REFERENCES auth.users(id)` column to `agent_messages`. Backfill existing user-role messages with `user_id` from their parent `agent_conversations` row.
- [ ] T002 [US1] Create migration `make_conversations_team_scoped.sql` — Add `created_by UUID REFERENCES auth.users(id)` column to `agent_conversations`, backfill from `user_id`. Add `is_active BOOLEAN NOT NULL DEFAULT false` column. Mark the most recent conversation per agent as active. Make `user_id` nullable (deprecate but don't drop yet).
- [ ] T003 [US1] Create migration `update_chat_rls_policies.sql` — Drop old per-user INSERT/UPDATE/DELETE policies on `agent_conversations` and `agent_messages`. Create new team-scoped policies: team members can create/update conversations, send messages; owners/admins can delete conversations and messages. Keep existing SELECT policies unchanged (already team-scoped).
- [ ] T004 [US1] Create migration `add_chat_to_realtime_publication.sql` — Add `agent_messages` and `agent_conversations` tables to `supabase_realtime` publication.
- [ ] T005 [US4] Create migration `shared_agent_connections_function.sql` — Create `get_agent_available_connections(p_agent_id UUID, p_user_id UUID)` SQL function that returns the user's own connections UNION owner/admin connections for the agent's team, with `is_own_connection` flag for priority.
- [ ] T006 Apply all migrations to test branch DB (`ejqumzvclfkbbzzdvmmi`) using Supabase MCP `apply_migration`. Verify schema changes with `list_tables` and `execute_sql`.

**Checkpoint**: Database schema ready for code changes.

---

## Phase 2: Shared Types & Query Layer

**Purpose**: Update TypeScript types and server-side query functions used by all subsequent phases.

- [ ] T007 [P] [US1] Create `src/types/agent-chat.ts` — Define `ChatSender { id, fullName, avatarUrl }`, `SharedChatMessage { id, role, content, sender?, createdAt, metadata }`, and `ConversationSummary { id, title, createdBy, createdAt, updatedAt, isActive, messageCount, participants }`.
- [ ] T008 [US1] Update `src/lib/queries/agent-conversations.ts` — Replace `getLatestConversation(supabase, agentId, userId)` with `getActiveConversation(supabase, agentId)` that finds the conversation with `is_active = true` for the given agent (no user filter). Update `getConversationMessages` to join `profiles` table for sender info (fullName, avatarUrl) using `sender_id`.
- [ ] T009 [US1] Update `src/lib/actions/agent-conversations.ts` — Modify `loadConversationHistory` to call `getActiveConversation` instead of `getLatestConversation`. Return messages with sender info in metadata.

**Checkpoint**: Query layer returns team-scoped conversations with sender attribution.

---

## Phase 3: User Story 1 — Shared Team Conversations (P1)

**Goal**: All team members see and contribute to the same conversation thread with each agent.

**Independent Test**: Two users on the same team can send messages to an agent and see each other's messages.

### API Changes

- [ ] T010 [US1] Update `src/app/api/agents/[id]/chat/route.ts` — Conversation lookup: find agent's active conversation (`is_active = true`) instead of user's personal one. On new conversation creation, set `created_by = user.id`, `is_active = true`, and unset `is_active` on previous active conversation. Add `sender_id: user.id` to message INSERT.
- [ ] T011 [US1] Create `src/app/api/agents/[id]/conversations/route.ts` — GET endpoint returning paginated list of conversations for an agent, including title, createdBy (with profile info), date, isActive, messageCount, and participant list (distinct sender_ids joined to profiles).
- [ ] T012 [US1] Create `src/app/api/agents/[id]/conversations/[conversationId]/activate/route.ts` — POST endpoint that sets the target conversation's `is_active = true` and all others for that agent to `false`. Auth check: team member.

### Hook Changes

- [ ] T013 [US1] Update `src/hooks/use-agent-chat.ts` — History loading: use `getActiveConversation` (team-scoped). Add Supabase Realtime subscription to `agent_messages` table filtered by `conversation_id` — when INSERT events arrive from other users, append to local message list. Subscribe to `agent_conversations` for `is_active` changes to auto-switch conversations. Include sender info in message metadata.
- [ ] T014 [US1] Regenerate `src/lib/supabase/database.types.ts` — Run `generate_typescript_types` via Supabase MCP to pick up new columns (`sender_id`, `created_by`, `is_active`).

**Checkpoint**: Conversations are shared — all team members see the same thread. Real-time sync works.

---

## Phase 4: User Story 2 — Message Attribution (P1)

**Goal**: Each message displays who sent it — sender name and avatar for human messages, agent identity for assistant messages.

**Independent Test**: Open agent chat, send a message — your name and avatar appear. Another user's messages show their identity.

- [ ] T015 [US2] Update `src/components/agent-detail/chat-panel.tsx` — Modify `ChatMessageItem` component: for `role === 'user'` messages, extract `senderId`, `senderName`, `senderAvatar` from message metadata. Display sender avatar (using `Avatar` component) and name above/beside user messages. Messages from the current user align right (as today). Messages from other team members align left with their avatar/name (styled differently from agent messages). Add message grouping: consecutive messages from the same sender don't repeat avatar/name.
- [ ] T016 [P] [US2] Pass current user info to `ChatPanel` — Update `src/app/(dashboard)/agents/[id]/page.tsx` to pass `currentUserId` to `ChatPanel` so it can distinguish own messages from other team members' messages.

**Checkpoint**: All messages show correct sender attribution. Own messages vs teammates visually distinct.

---

## Phase 5: User Story 3 — Conversation History Browser (P2)

**Goal**: Users can browse and switch between past conversations with an agent.

**Independent Test**: Click history button — see list of past conversations, click one to switch to it.

- [ ] T017 [US3] Create `src/hooks/use-conversation-history.ts` — Hook using TanStack React Query to fetch `GET /api/agents/[id]/conversations`. Returns `{ conversations, isLoading, switchConversation(id), hasMore, loadMore }`. `switchConversation` calls POST `/activate` endpoint and invalidates chat query.
- [ ] T018 [US3] Create `src/components/agent-detail/conversation-history-panel.tsx` — Sheet/sidebar component that displays conversation list. Each row: title, created by (avatar + name), relative date, participant avatar stack, message count badge. Active conversation highlighted. "New Chat" button at top. Uses `useConversationHistory` hook.
- [ ] T019 [US3] Update `src/app/(dashboard)/agents/[id]/page.tsx` — Add "Chat History" icon button in the agent chat header area. Toggle the `ConversationHistoryPanel` open/closed. Wire up conversation switching (when user selects a conversation, reload chat with that conversation's messages).
- [ ] T020 [US3] Update `src/components/agent-detail/chat-panel.tsx` — Add `onNewChat` prop that also notifies other clients via the Realtime `is_active` change. Add `conversationId` as controlled prop so parent can switch it when history selection changes.

**Checkpoint**: Users can browse, create, and switch between conversations.

---

## Phase 6: User Story 4 — Shared Agent App Connections (P2)

**Goal**: App connections used in agent workflows are available to all team members without reconnecting.

**Independent Test**: Owner connects Gmail to agent. Team member chats with agent — agent can use Gmail.

- [ ] T021 [US4] Update `src/app/api/agents/[id]/chat/route.ts` — Replace `app_connections` query (line ~70) with RPC call to `get_agent_available_connections(agentId, userId)`. When building Composio tools, use the appropriate entity_id: prefer user's own connection (`is_own_connection = true`), fall back to shared connection.
- [ ] T022 [P] [US4] Update `src/app/(dashboard)/agents/[id]/page.tsx` — Add "Connected Apps" section to the agent detail sidebar showing which apps are available for this agent. For shared connections, show the connection owner's avatar. For apps the user hasn't connected, show a "Connect your own" button.
- [ ] T023 [US4] Update `src/lib/ai/system-prompt.ts` (or wherever `buildAgentSystemPrompt` is) — Include shared connection info in the system prompt so the agent knows which apps are available and whose connection is being used.

**Checkpoint**: Agent chat works with shared app connections. User's own connection takes priority.

---

## Phase 7: User Story 5 — Real-time Presence (P3)

**Goal**: Show who is currently viewing the agent chat.

- [ ] T024 [US5] Create `src/hooks/use-agent-presence.ts` — Hook using Supabase Realtime Presence channel. Tracks which users are viewing the agent chat page. Returns `{ activeUsers: { id, fullName, avatarUrl }[] }`. Joins/leaves channel on mount/unmount.
- [ ] T025 [US5] Update `src/components/agent-detail/chat-panel.tsx` or agent page — Add a small avatar stack in the chat header showing who is currently viewing. Tooltip on hover shows full names.

**Checkpoint**: Users can see who else is in the chat room.

---

## Phase 8: Testing

**Purpose**: Unit tests for new and modified code.

- [ ] T026 [P] Update `src/hooks/__tests__/use-agent-chat.test.ts` — Update existing tests for shared conversation model (no user_id filter). Add tests for: real-time message subscription, conversation switching, sender info in metadata.
- [ ] T027 [P] Create `src/hooks/__tests__/use-conversation-history.test.ts` — Tests for: fetching conversation list, pagination, switching active conversation, loading states.
- [ ] T028 [P] Update `src/components/agent-detail/__tests__/chat-panel.test.tsx` — Update for message attribution: verify sender name/avatar displayed, own messages vs teammate messages styled differently, message grouping.
- [ ] T029 [P] Create `src/components/agent-detail/__tests__/conversation-history-panel.test.tsx` — Tests for: rendering conversation list, clicking to switch, active highlighting, new chat button.
- [ ] T030 [P] Update `src/lib/queries/__tests__/agent-conversations.test.ts` — Update for team-scoped `getActiveConversation` query.

**Checkpoint**: All tests pass. `bun run build` succeeds. 957+ tests green.

---

## Phase 9: Polish & Data Migration

**Purpose**: Production data migration, edge case handling, cleanup.

- [ ] T031 Apply all migrations to production DB (`djohaxwfketlsjurwqne`) using Supabase MCP `apply_migration`.
- [ ] T032 Create local migration files matching production timestamps (same pattern as billing feature).
- [ ] T033 Verify production data: all existing messages have `sender_id` backfilled, each agent has exactly one `is_active` conversation.
- [ ] T034 Remove deprecated `user_id` references from queries (ensure no code still filters by `user_id` on conversations).
- [ ] T035 Final build + test verification: `bun run build && bun run test`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (DB)**: No dependencies — start immediately. BLOCKS all other phases.
- **Phase 2 (Types/Queries)**: Depends on Phase 1. BLOCKS Phases 3-6.
- **Phase 3 (Shared Conversations)**: Depends on Phase 2. Core feature.
- **Phase 4 (Attribution)**: Depends on Phase 3 (needs sender info flowing through).
- **Phase 5 (History Browser)**: Depends on Phase 3. Can run in parallel with Phase 4.
- **Phase 6 (Shared Connections)**: Depends on Phase 1 (migration 5). Can run in parallel with Phases 4-5.
- **Phase 7 (Presence)**: Depends on Phase 3. Can run in parallel with Phases 4-6.
- **Phase 8 (Testing)**: Depends on Phases 3-7.
- **Phase 9 (Polish)**: Depends on Phase 8.

### Parallel Opportunities

```
Phase 1 (DB) → Phase 2 (Types) → Phase 3 (Shared Chat)
                                       ├─→ Phase 4 (Attribution)
                                       ├─→ Phase 5 (History) [parallel with 4]
                                       ├─→ Phase 6 (Connections) [parallel with 4,5]
                                       └─→ Phase 7 (Presence) [parallel with 4,5,6]
                                                    ↓
                                             Phase 8 (Tests)
                                                    ↓
                                             Phase 9 (Polish)
```

### Implementation Strategy

1. Complete Phase 1 + 2 first (blocking prerequisites)
2. Complete Phase 3 (core shared chat — P1 MVP)
3. Complete Phase 4 (attribution — P1, tightly coupled with Phase 3)
4. Validate: shared chat with attribution works end-to-end
5. Phases 5, 6, 7 in parallel or sequential based on priority
6. Phase 8 (testing) after all features implemented
7. Phase 9 (production migration + polish) last
