# Tasks: Autonomous Agent with Dynamic Skill Creation

**Input**: Design documents from `/specs/018-autonomous-agent-skills/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec. Test tasks omitted.

**Organization**: Tasks grouped by user story (P1 → P2 → P3) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in descriptions

---

## Phase 1: Setup

**Purpose**: Schema migration and shared infrastructure for tool-calling agents

- [ ] T001 Apply migration to extend `agent_skills` table: make `workflow_id` nullable, add `action_template JSONB`, `description TEXT`, `source TEXT DEFAULT 'manual'` columns, and add performance indexes in `supabase/migrations/XXXX_extend_agent_skills_for_dynamic_skills.sql`
- [ ] T002 Regenerate Supabase TypeScript types after migration in `src/lib/supabase/database.types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tool catalog builder and conversation queries that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Create tool catalog builder that maps Composio actions to OpenAI function definitions in `src/lib/composio/tool-catalog.ts` — exports `buildToolCatalog(appConnections)` that calls `getAppActions()` per connected app and returns `OpenAITool[]`
- [ ] T004 Create conversation query functions in `src/lib/queries/agent-conversations.ts` — exports `getLatestConversation(supabase, agentId, userId)` and `getConversationMessages(supabase, conversationId, limit?)` for loading chat history
- [ ] T005 [P] Create `ToolExecutionCard` component in `src/components/agent-detail/tool-execution-card.tsx` — displays inline tool execution status (loading spinner with action name, then success/failure result) using shadcn Card, Badge, and Spinner primitives

**Checkpoint**: Foundation ready — tool catalog, conversation queries, and execution UI component available

---

## Phase 3: User Story 1 — Agent Executes a Single Action via Chat (Priority: P1) MVP

**Goal**: User types a natural language request in chat, agent identifies the right tool from connected apps, executes it via Composio, and reports the result back — the agent can DO things, not just talk.

**Independent Test**: Connect a GitHub account, ask the agent to create an issue, verify the issue appears on GitHub and the result is shown in chat.

### Implementation for User Story 1

- [ ] T006 [US1] Rewrite `src/lib/ai/agent-chat.ts` — replace `streamAgentChat` with `runAgentChatLoop(agent, messages, tools, connectedApps, supabase, conversationId)` that: (1) builds system prompt with agent config + available tools, (2) calls Kiro Chat API with `tools` param and `tool_choice: "auto"`, (3) implements the tool-calling loop — if AI returns `tool_calls`, execute each via `composio.actions.execute()`, persist tool messages, feed results back to AI, repeat until AI responds with text, (4) returns a ReadableStream with SSE events (`tool_start`, `tool_result`, and standard text deltas)
- [ ] T007 [US1] Rewrite `src/app/api/agents/[id]/chat/route.ts` — update POST handler to: (1) load agent config, (2) load user's connected apps via `getAppConnections()`, (3) build tool catalog via `buildToolCatalog()`, (4) load conversation history (last 50 messages including metadata for tool calls), (5) call `runAgentChatLoop()`, (6) return SSE stream with `X-Conversation-Id` header, (7) update agent status to `running` at start and `idle` on completion
- [ ] T008 [US1] Rewrite `src/hooks/use-agent-chat.ts` — add: (1) `loadHistory()` that fetches latest conversation and messages on mount via server action, (2) parse custom SSE events (`tool_start`, `tool_result`) alongside standard text deltas, (3) maintain `toolExecutions` state array for rendering execution cards, (4) track `conversationId` from X-Conversation-Id header or loaded history
- [ ] T009 [US1] Update `src/components/agent-detail/chat-message.tsx` — add rendering for tool-related messages: (1) `role: 'assistant'` with `metadata.tool_calls` shows "Agent is executing..." with action names, (2) `role: 'tool'` renders the `ToolExecutionCard` component with success/failure status and result summary
- [ ] T010 [US1] Update `src/components/agent-detail/chat-messages.tsx` — integrate tool execution cards inline in the message list, handle new message types from the rewritten hook
- [ ] T011 [US1] Update `src/components/agent-detail/chat-panel.tsx` — wire the rewritten `useAgentChat` hook (now includes history loading and tool execution state), show conversation starters only when no history exists, handle loading state during history fetch
- [ ] T012 [US1] Handle error cases in chat route: (1) missing app connection → agent responds with guidance to connect in Settings (FR-005), (2) ambiguous intent → agent asks clarifying question (FR-012), (3) execution failure → agent reports error and suggests next steps (FR-011), (4) destructive action detection → agent asks for confirmation (FR-013)

**Checkpoint**: User Story 1 complete — agent can execute single actions via chat with real Composio tool calls, results displayed inline

---

## Phase 4: User Story 2 — Agent Loads Conversation History (Priority: P1)

**Goal**: Previous conversation messages load on page mount, including tool execution results. Agent maintains context across sessions.

**Independent Test**: Send messages, refresh the page, verify all messages (including tool results) still appear and agent uses prior context.

### Implementation for User Story 2

- [ ] T013 [US2] Create server action `loadConversationHistory` in `src/lib/actions/agent-conversations.ts` — fetches latest conversation for agent+user pair, returns messages with metadata, handles "no conversation" case by returning null
- [ ] T014 [US2] Update `src/hooks/use-agent-chat.ts` — call `loadConversationHistory` on mount via `useEffect`, populate `messages` and `conversationId` state, set loading state during fetch, reconstruct `toolExecutions` state from loaded messages with `role: 'tool'`
- [ ] T015 [US2] Update `src/components/agent-detail/chat-panel.tsx` — show loading skeleton during history fetch, auto-scroll to bottom after history loads, show conversation starters only when history is empty
- [ ] T016 [US2] Ensure chat route persists ALL message types correctly: (1) user messages (role: 'user'), (2) assistant tool-calling messages (role: 'assistant', metadata: {tool_calls}), (3) tool result messages (role: 'tool', metadata: {tool_call_id, action_name, app_id, success, duration_ms}), (4) assistant text responses (role: 'assistant', content: text)

**Checkpoint**: User Story 2 complete — conversation history persists across page reloads, tool results display correctly from loaded history

---

## Phase 5: User Story 3 — Agent Chains Multiple Actions (Priority: P2)

**Goal**: Agent breaks multi-step requests into sequential tool calls, executes them, passes output between steps, and reports final result.

**Independent Test**: Ask "Check my open GitHub PRs and send me a summary on Slack", verify both actions execute in sequence with correct data passing.

### Implementation for User Story 3

- [ ] T017 [US3] Update `runAgentChatLoop` in `src/lib/ai/agent-chat.ts` — ensure the tool-calling loop: (1) supports multiple sequential AI→tool→AI rounds (max 10 iterations), (2) accumulates all tool results as context for subsequent AI calls, (3) sends `tool_start`/`tool_result` SSE events for each step so client shows progress, (4) handles partial failure (some steps succeed, one fails) by reporting status of all steps
- [ ] T018 [US3] Update `src/hooks/use-agent-chat.ts` — handle multiple `tool_start`/`tool_result` event pairs in a single response, maintain ordered `toolExecutions` array showing progress of multi-step execution
- [ ] T019 [US3] Update `src/components/agent-detail/chat-message.tsx` — render multi-step execution as a sequence of `ToolExecutionCard` components, show step numbers and data flow between steps
- [ ] T020 [US3] Handle multi-step error cases: (1) step 2 fails after step 1 succeeds → report both results clearly (FR-011), (2) multiple missing connections detected upfront → list ALL missing connections, not one at a time (acceptance scenario 3), (3) max iterations reached → force text response with progress summary

**Checkpoint**: User Story 3 complete — agent chains multiple actions, passes data between steps, shows progress for each step

---

## Phase 6: User Story 4 — Agent Discovers Available Tools (Priority: P2)

**Goal**: Agent dynamically knows what tools are available based on connected apps. User can ask "What can you do?" and get an accurate list.

**Independent Test**: Ask "What can you do?", verify response matches connected apps. Connect a new app, return to chat, verify new capabilities listed.

### Implementation for User Story 4

- [ ] T021 [US4] Update system prompt building in `src/lib/ai/agent-chat.ts` — include a capabilities section in the system prompt that lists connected apps and their top actions grouped by category (e.g., "With GitHub you can: create issues, manage PRs, list repos...")
- [ ] T022 [US4] Update `src/components/agent-detail/connection-indicators.tsx` — show real connected apps derived from user's `app_connections` (not hardcoded), display app icons and connection status
- [ ] T023 [US4] Update agent detail page sidebar in `src/app/(dashboard)/agents/[id]/page.tsx` — show "Connected Apps" section with real data from `app_connections`, include "Connect more apps" link to Settings

**Checkpoint**: User Story 4 complete — agent knows its capabilities, user can discover them via chat and sidebar

---

## Phase 7: User Story 5 — Save Execution as Reusable Skill (Priority: P3)

**Goal**: After successful execution, user saves it as a named skill. The skill stores the action pattern and can be re-invoked by name.

**Independent Test**: Execute "Create a GitHub issue", say "Save this as Quick Bug Report", then say "Run Quick Bug Report" with a new title — verify it runs without re-planning.

### Implementation for User Story 5

- [ ] T024 [US5] Create server actions in `src/lib/actions/agent-skills.ts` — `saveSkillFromExecution(input)` that: (1) validates input with Zod, (2) extracts action template from tool calls (single or multi-step), (3) detects context-specific values and converts to `{{placeholder}}` variables, (4) inserts into `agent_skills` with `source: 'dynamic'` and `action_template` JSONB
- [ ] T025 [US5] Create `SaveSkillDialog` component in `src/components/agent-detail/save-skill-dialog.tsx` — dialog with name input, optional description, triggered by user saying "save this as a skill" or via a save button on successful execution cards, calls `saveSkillFromExecution` server action
- [ ] T026 [US5] Update system prompt in `src/lib/ai/agent-chat.ts` — load dynamic skills from `agent_skills WHERE source = 'dynamic'` and include them in system prompt with action templates, so AI knows about saved skills and can invoke them by name
- [ ] T027 [US5] Update `runAgentChatLoop` in `src/lib/ai/agent-chat.ts` — when AI recognizes a skill invocation (via system prompt context), execute the skill's `action_template` directly instead of full tool discovery, fill `{{placeholders}}` from conversation context
- [ ] T028 [US5] Update `src/components/agent-detail/skills-list.tsx` — show both manual (workflow-linked) and dynamic (action-template) skills, add delete button for dynamic skills, show skill source badge
- [ ] T029 [US5] Add `deleteSkill` server action in `src/lib/actions/agent-skills.ts` — validates ownership, deletes from `agent_skills`

**Checkpoint**: User Story 5 complete — skills can be saved from successful executions and re-invoked by name

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T030 Handle edge case: rate limit hit during multi-step execution — detect 429 responses from Composio, report to user with retry suggestion
- [ ] T031 Handle edge case: OAuth token expired mid-execution — detect auth errors from Composio, report to user with reconnection guidance
- [ ] T032 Handle edge case: long-running actions (>30s) — implement per-tool timeout, report timeout to user, suggest breaking into smaller requests
- [ ] T033 Update agent status (`running`/`idle`) in real-time during chat execution via Supabase update in chat route
- [ ] T034 Run `bun run build` — verify zero TypeScript errors across all modified files
- [ ] T035 Run `bun run lint` — verify zero lint warnings
- [ ] T036 Validate quickstart.md scenarios end-to-end: single action, conversation persistence, multi-step, tool discovery, skill save/invoke

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must be regenerated)
- **US1 (Phase 3)**: Depends on Phase 2 — core chat rewrite
- **US2 (Phase 4)**: Depends on Phase 3 (T006-T007 for message persistence format)
- **US3 (Phase 5)**: Depends on Phase 3 (single action must work before chaining)
- **US4 (Phase 6)**: Depends on Phase 2 (tool catalog builder) — can run in parallel with US3
- **US5 (Phase 7)**: Depends on Phase 3 + Phase 5 (needs single + multi-step execution working)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
Phase 3: US1 (Single Action) ← MVP
    ↓            ↓
Phase 4: US2    Phase 5: US3    Phase 6: US4
(History)       (Chaining)      (Discovery)
    ↓                ↓
    └────────┬───────┘
             ↓
      Phase 7: US5 (Skills)
             ↓
      Phase 8: Polish
```

### Within Each User Story

- Backend (agent-chat.ts, route.ts) before frontend (hooks, components)
- Core logic before error handling
- Shared components (T005) before story-specific usage

### Parallel Opportunities

**Phase 2** (all can run in parallel):

```
T003: tool-catalog.ts
T004: agent-conversations.ts
T005: tool-execution-card.tsx
```

**Phase 3** (after T006-T007 backend):

```
T009: chat-message.tsx updates
T010: chat-messages.tsx updates
T011: chat-panel.tsx updates
```

**After Phase 3 completes** (US4 can run alongside US3):

```
US3 (Phase 5): T017-T020
US4 (Phase 6): T021-T023
```

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tasks together (different files):
Task: "Create tool catalog builder in src/lib/composio/tool-catalog.ts"
Task: "Create conversation queries in src/lib/queries/agent-conversations.ts"
Task: "Create ToolExecutionCard in src/components/agent-detail/tool-execution-card.tsx"
```

## Parallel Example: User Story 1 Frontend

```bash
# After backend tasks T006-T007 complete, launch frontend in parallel:
Task: "Update chat-message.tsx for tool message rendering"
Task: "Update chat-messages.tsx for tool execution cards"
Task: "Update chat-panel.tsx with rewritten hook"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration + types)
2. Complete Phase 2: Foundational (tool catalog, queries, UI component)
3. Complete Phase 3: User Story 1 (single action execution)
4. **STOP and VALIDATE**: Connect GitHub, ask agent to create an issue, verify on GitHub
5. Deploy/demo if ready — agent can now DO things

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Single Action) → Test independently → **MVP!**
3. Add US2 (History) → Test independently → Agent has memory
4. Add US3 (Chaining) + US4 (Discovery) → Test independently → Agent is powerful
5. Add US5 (Skills) → Test independently → Agent learns
6. Polish → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story is independently testable at its checkpoint
- Max 10 tool calls per request as safety cap
- Max 50 messages loaded as AI context
- Use `select('*')` for Supabase queries (PostgREST schema cache issue)
- RPC functions for complex DB operations (bypass PostgREST cache for new columns)
- All SSE events use standard `event:` + `data:` format
