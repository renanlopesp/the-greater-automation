# Tasks: MCP Tools Server

**Input**: Design documents from `/specs/058-mcp-tools-server/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mcp-tools.md, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies and create base MCP server scaffold

- [x] T001 Install `@modelcontextprotocol/sdk` and `zod` dependencies via `bun add @modelcontextprotocol/sdk zod`
- [x] T002 Create MCP context module with TeamContext type and env var parsing in `src/lib/mcp/context.ts` — must read SNEW_TEAM_ID, SNEW_USER_ID, SNEW_STORE_ID, SNEW_TASK_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and create a Supabase service role client
- [x] T003 Create MCP server entry point in `src/lib/mcp/snew-tools-server.ts` — instantiate McpServer with name "snew-tools" version "1.0.0", connect to StdioServerTransport, log startup to stderr

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactor existing tool execute functions to be importable standalone, decoupled from Vercel AI SDK wrappers

**CRITICAL**: No user story work can begin until this phase is complete — the MCP tools need standalone execute functions to call.

- [x] ~~T004-T040~~ **SKIPPED** — Simplified approach: tool-registry.ts calls buildPlatformTools() and buildRetailTools() directly, wrapping each tool's execute() for MCP. No refactor needed.
- [x] T004 Refactor `src/lib/ai/platform-tools.ts` — extract SNEW_LIST_SKILLS execute logic into an exported standalone function `executeListSkills(ctx: ToolContext): Promise<ToolResult>` that takes a context object (supabase client, teamId) instead of closure variables. Keep the existing `buildPlatformTools()` wrapper calling the new function for backward compatibility.
- [ ] T005 Refactor `src/lib/ai/platform-tools.ts` — extract SNEW_GET_SKILL execute logic into exported `executeGetSkill(ctx, params)`. Same pattern as T004.
- [ ] T006 Refactor `src/lib/ai/platform-tools.ts` — extract SNEW_RUN_SKILL execute logic into exported `executeRunSkill(ctx, params)`. This is the largest execute function (seasonal-calendar special case + generic skill execution). Same pattern as T004.
- [ ] T007 [P] Refactor `src/lib/ai/platform-tools.ts` — extract these execute functions in parallel (all follow same pattern as T004): `executeListWorkflows`, `executeRunWorkflow`, `executeListRuns`, `executeCreateSkill`, `executeActivateSkill`, `executeGetSkillsActivity`
- [ ] T008 [P] Refactor `src/lib/ai/platform-tools.ts` — extract Composio-related execute functions: `executeCheckConnections`, `executeListAvailableApps`, `executeListAppCapabilities`
- [ ] T009 [P] Refactor `src/lib/ai/platform-tools.ts` — extract `executeCreateNotification` and `executeModifyArtifact`
- [ ] T010 Refactor `src/lib/ai/retail-tools.ts` — extract STORE_QUERY_STOCK execute logic into exported `executeQueryStock(ctx, params)` that takes a context object (supabase client, storeId, teamId) instead of closure variables. Keep `buildRetailTools()` calling the new function for backward compatibility.
- [ ] T011 [P] Refactor `src/lib/ai/retail-tools.ts` — extract STORE_QUERY_SALES and STORE_LIST_ORDERS execute functions. Same pattern as T010.
- [ ] T012 [P] Refactor `src/lib/ai/retail-tools.ts` — extract product management execute functions: `executeUpdateAlert`, `executeUpdateSchedule`, `executeDeleteProduct`, `executeTriggerSync`, `executeUpdateProduct`, `executeCreateProduct`, `executeAddProductImage`
- [ ] T013 [P] Refactor `src/lib/ai/retail-tools.ts` — extract remaining execute functions: `executeQueryCategories`, `executeManageCategories`, `executeQueryCustomers`, `executeManageCoupons`, `executeManageOrders`, `executeGetAbandonedCheckouts`, `executeManageDraftOrders`, `executeManageFulfillment`, `executeGetPaymentOptions`, `executeQueryTransactions`, `executeManagePages`, `executeGetStoreInfo`, `executeQueryMargins`
- [ ] T014 Verify backward compatibility — run `bun run build` to ensure `buildPlatformTools()` and `buildRetailTools()` still work unchanged with the existing `/api/chat` route

**Checkpoint**: All 37 execute functions are exported standalone. Existing chat route still works. Build passes.

---

## Phase 3: User Story 1 — Managed Agent Calls Business Tools (Priority: P1) MVP

**Goal**: Register STORE_QUERY_SALES, STORE_QUERY_STOCK, STORE_LIST_ORDERS as MCP tools and verify they return real data from Supabase.

**Independent Test**: Run MCP server with test env vars, connect MCP Inspector, call STORE_QUERY_SALES with period "today", verify response contains real sales data.

### Implementation for User Story 1

- [ ] T015 [US1] Create tool registration module `src/lib/mcp/tool-registry.ts` — export a `registerAllTools(server: McpServer, ctx: ToolContext)` function. Start by registering STORE_QUERY_SALES with Zod input schema (`z.object({ period: z.enum([...]), start_date: z.string().optional(), ... })`) and calling `executeQuerySales(ctx, params)`. Return result as `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`.
- [ ] T016 [US1] Register STORE_QUERY_STOCK in `src/lib/mcp/tool-registry.ts` — Zod schema + call to `executeQueryStock(ctx, params)`
- [ ] T017 [US1] Register STORE_LIST_ORDERS in `src/lib/mcp/tool-registry.ts` — Zod schema + call to `executeListOrders(ctx, params)`
- [ ] T018 [US1] Wire tool-registry into snew-tools-server.ts — import `registerAllTools`, call it after context initialization, before `server.connect(transport)`
- [ ] T019 [US1] Manual test: run MCP server with real env vars, use MCP Inspector (`npx @modelcontextprotocol/inspector`) to call STORE_QUERY_SALES, verify real data returns

**Checkpoint**: MCP server starts, exposes 3 retail tools, returns real Supabase data via stdio. This is the MVP — proves the full pipeline works.

---

## Phase 4: User Story 2 — Agent Manages Skills and Artifacts (Priority: P1)

**Goal**: Register all skill and artifact tools (SNEW_LIST_SKILLS, SNEW_GET_SKILL, SNEW_RUN_SKILL, SNEW_ACTIVATE_SKILL, SNEW_GET_SKILLS_ACTIVITY, SNEW_MODIFY_ARTIFACT) as MCP tools.

**Independent Test**: Call SNEW_LIST_SKILLS via MCP Inspector, verify skills list returns. Call SNEW_RUN_SKILL with "seasonal-calendar", verify artifact_data is written to tasks table.

### Implementation for User Story 2

- [ ] T020 [P] [US2] Register SNEW_LIST_SKILLS in `src/lib/mcp/tool-registry.ts` — Zod schema (empty object) + call to `executeListSkills(ctx)`
- [ ] T021 [P] [US2] Register SNEW_GET_SKILL in `src/lib/mcp/tool-registry.ts` — Zod schema (`z.object({ skill_slug: z.string() })`) + call to `executeGetSkill(ctx, params)`
- [ ] T022 [US2] Register SNEW_RUN_SKILL in `src/lib/mcp/tool-registry.ts` — Zod schema + call to `executeRunSkill(ctx, params)`. This is the most complex tool (seasonal-calendar special case).
- [ ] T023 [P] [US2] Register SNEW_ACTIVATE_SKILL and SNEW_GET_SKILLS_ACTIVITY in `src/lib/mcp/tool-registry.ts`
- [ ] T024 [US2] Register SNEW_MODIFY_ARTIFACT in `src/lib/mcp/tool-registry.ts` — conditionally registered only when `ctx.taskId` is present. Zod schema for operation enum + date_ids + artifact_data.
- [ ] T025 [US2] Manual test: call SNEW_LIST_SKILLS and SNEW_RUN_SKILL via MCP Inspector, verify database writes

**Checkpoint**: Skills and artifacts work through MCP. Agent can execute seasonal-calendar and write HTML dashboards.

---

## Phase 5: User Story 3 — Agent Queries Composio Connections (Priority: P2)

**Goal**: Register SNEW_CHECK_CONNECTIONS, SNEW_LIST_AVAILABLE_APPS, SNEW_LIST_APP_CAPABILITIES as MCP tools.

**Independent Test**: Call SNEW_CHECK_CONNECTIONS via MCP Inspector, verify it returns Composio connections for the user.

### Implementation for User Story 3

- [ ] T026 [P] [US3] Register SNEW_CHECK_CONNECTIONS in `src/lib/mcp/tool-registry.ts` — Zod schema (empty) + call to `executeCheckConnections(ctx)`
- [ ] T027 [P] [US3] Register SNEW_LIST_AVAILABLE_APPS in `src/lib/mcp/tool-registry.ts` — Zod schema (empty) + call to `executeListAvailableApps(ctx)`
- [ ] T028 [P] [US3] Register SNEW_LIST_APP_CAPABILITIES in `src/lib/mcp/tool-registry.ts` — Zod schema (`z.object({ app_id: z.string() })`) + call to `executeListAppCapabilities(ctx, params)`

**Checkpoint**: Composio connection queries work through MCP.

---

## Phase 6: User Story 4 — Agent Creates Notifications (Priority: P2)

**Goal**: Register SNEW_CREATE_NOTIFICATION as MCP tool.

**Independent Test**: Call SNEW_CREATE_NOTIFICATION via MCP Inspector, verify notification row created in database.

### Implementation for User Story 4

- [ ] T029 [US4] Register SNEW_CREATE_NOTIFICATION in `src/lib/mcp/tool-registry.ts` — Zod schema (`z.object({ urgency: z.enum([...]), title: z.string(), body: z.string().optional(), cta_url: z.string().optional() })`) + call to `executeCreateNotification(ctx, params)`

**Checkpoint**: Notifications work through MCP.

---

## Phase 7: User Story 5 — Agent Manages Store Products and Categories (Priority: P2)

**Goal**: Register all remaining STORE*\* and SNEW*\* tools as MCP tools.

**Independent Test**: Call STORE_CREATE_PRODUCT via MCP Inspector, verify product created. Call STORE_MANAGE_COUPONS, verify coupon created.

### Implementation for User Story 5

- [ ] T030 [P] [US5] Register STORE_UPDATE_ALERT and STORE_UPDATE_SCHEDULE in `src/lib/mcp/tool-registry.ts`
- [ ] T031 [P] [US5] Register STORE_DELETE_PRODUCT and STORE_TRIGGER_SYNC in `src/lib/mcp/tool-registry.ts`
- [ ] T032 [P] [US5] Register STORE_UPDATE_PRODUCT and STORE_CREATE_PRODUCT in `src/lib/mcp/tool-registry.ts`
- [ ] T033 [P] [US5] Register STORE_QUERY_CATEGORIES and STORE_MANAGE_CATEGORIES in `src/lib/mcp/tool-registry.ts`
- [ ] T034 [P] [US5] Register STORE_QUERY_CUSTOMERS and STORE_MANAGE_COUPONS in `src/lib/mcp/tool-registry.ts`
- [ ] T035 [P] [US5] Register STORE_MANAGE_ORDERS and STORE_GET_ABANDONED_CHECKOUTS in `src/lib/mcp/tool-registry.ts`
- [ ] T036 [P] [US5] Register STORE_ADD_PRODUCT_IMAGE and STORE_MANAGE_DRAFT_ORDERS in `src/lib/mcp/tool-registry.ts`
- [ ] T037 [P] [US5] Register STORE_MANAGE_FULFILLMENT and STORE_GET_PAYMENT_OPTIONS in `src/lib/mcp/tool-registry.ts`
- [ ] T038 [P] [US5] Register STORE_QUERY_TRANSACTIONS, STORE_MANAGE_PAGES, STORE_GET_STORE_INFO, STORE_QUERY_MARGINS in `src/lib/mcp/tool-registry.ts`
- [ ] T039 [P] [US5] Register remaining SNEW\_\* tools: SNEW_LIST_WORKFLOWS, SNEW_RUN_WORKFLOW, SNEW_LIST_RUNS, SNEW_CREATE_SKILL in `src/lib/mcp/tool-registry.ts`
- [ ] T040 [US5] Add conditional registration logic — STORE\_\* tools only registered when `ctx.storeId` is present, SNEW_MODIFY_ARTIFACT only when `ctx.taskId` is present

**Checkpoint**: All 37 tools registered. Full tool count matches spec (14 SNEW*\* + 23 STORE*\*).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T041 Verify full tool count — run MCP server with all env vars set, call `listTools`, confirm exactly 37 tools are listed
- [x] T042 Verify conditional registration — run without SNEW*STORE_ID, confirm STORE*\* tools are absent. Run without SNEW_TASK_ID, confirm SNEW_MODIFY_ARTIFACT is absent.
- [x] T043 Error handling sweep — ensure all tool execute wrappers catch errors and return `{ content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true }` instead of crashing the server
- [x] T044 Run `bun run build` — verify zero TypeScript errors, existing chat route still works
- [x] T045 Run `bun run lint` — fix any lint warnings in new files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Phase 2 completion
  - US1 (Phase 3): Independent — proves the pipeline
  - US2 (Phase 4): Independent of US1
  - US3 (Phase 5): Independent of US1/US2
  - US4 (Phase 6): Independent
  - US5 (Phase 7): Independent — bulk registration of remaining tools
- **Polish (Phase 8)**: Depends on all user stories complete

### Within Each User Story

- Register tools in tool-registry.ts
- Wire into server entry point (done once in US1 T018)
- Manual verification via MCP Inspector

### Parallel Opportunities

- T007, T008, T009 can all run in parallel (different tool groups in platform-tools.ts)
- T011, T012, T013 can all run in parallel (different tool groups in retail-tools.ts)
- US3 tools (T026-T028) are all parallel
- US5 tools (T030-T039) are mostly parallel (different tool pairs)
- US2, US3, US4 can run in parallel after US1 establishes the pattern

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T004-T006 establish the pattern, these can run in parallel:
Task T007: "Extract executeListWorkflows, executeRunWorkflow, etc."
Task T008: "Extract executeCheckConnections, executeListAvailableApps, etc."
Task T009: "Extract executeCreateNotification, executeModifyArtifact"
Task T011: "Extract executeQuerySales, executeListOrders"
Task T012: "Extract product management execute functions"
Task T013: "Extract remaining retail execute functions"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational — at minimum extract the 3 retail execute functions needed for US1 (T010-T011)
3. Complete Phase 3: User Story 1 (T015-T019)
4. **STOP and VALIDATE**: MCP server returns real sales data via stdio
5. This proves the full pipeline: MCP SDK → Zod schemas → execute function → Supabase → JSON response

### Incremental Delivery

1. Setup + Foundational → all execute functions extracted
2. US1 → retail queries work → MVP validated
3. US2 → skills + artifacts work → core product features
4. US3-US5 → remaining tools → full coverage
5. Polish → verification + cleanup

---

## Notes

- All MCP tool responses serialize execute function results as JSON text content
- The Foundational phase (T004-T014) is the largest effort — extracting 37 execute functions from closures to standalone exports
- The pattern is mechanical: each execute function takes `(ctx: ToolContext, params?: {...})` and returns the same result as before
- `buildPlatformTools()` and `buildRetailTools()` remain unchanged in their public API — they just delegate to the new standalone functions internally
