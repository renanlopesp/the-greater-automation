# Tasks: Retail Pivot — AI Assistant for Store Owners

**Input**: Design documents from `/specs/027-retail-pivot/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story. Each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US8)
- Exact file paths included

---

## Phase 1: Setup

**Purpose**: Database schema and shared infrastructure

- [ ] T001 [P] Create migration for `stores` table in supabase/migrations/
- [ ] T002 [P] Create migration for `store_products` table in supabase/migrations/
- [ ] T003 [P] Create migration for `store_stock_alerts` table in supabase/migrations/
- [ ] T004 [P] Create migration for `store_orders` table in supabase/migrations/
- [ ] T005 [P] Create migration for `store_price_monitors` table in supabase/migrations/
- [ ] T006 [P] Create migration for `nuvemshop_webhooks` table in supabase/migrations/
- [ ] T007 Add `has_store` boolean column to `teams` table via migration in supabase/migrations/
- [ ] T008 Apply all migrations to test branch (`ejqumzvclfkbbzzdvmmi`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core business logic that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create segment skill templates — 8 segments × 4 agent roles — in src/lib/retail/segment-skills.ts
- [ ] T010 Create store provisioning logic (create store + 4 agents + skills + workflows based on priorities) in src/lib/retail/provision-store.ts
- [ ] T011 Create onboarding API route (POST create store, GET status) in src/app/api/onboarding/route.ts
- [ ] T012 Create Nuvemshop typed API client with rate limiting in src/lib/nuvemshop/client.ts
- [ ] T013 [P] Create Nuvemshop API response Zod schemas in src/lib/nuvemshop/types.ts

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Store Onboarding (Priority: P1) MVP

**Goal**: New user completes onboarding, gets store + agents created

**Independent Test**: Sign up → complete 4 steps → verify store record + 4 agents + skills exist in DB

### Implementation

- [ ] T014 [US1] Create onboarding layout (minimal, no sidebar) in src/app/(onboarding)/layout.tsx
- [ ] T015 [P] [US1] Create store name step component in src/components/onboarding/store-name-step.tsx
- [ ] T016 [P] [US1] Create segment selection step component in src/components/onboarding/segment-step.tsx
- [ ] T017 [P] [US1] Create platform selection step component in src/components/onboarding/platform-step.tsx
- [ ] T018 [P] [US1] Create priorities checklist step component in src/components/onboarding/priorities-step.tsx
- [ ] T019 [US1] Create onboarding page with multi-step state machine in src/app/(onboarding)/onboarding/page.tsx
- [ ] T020 [US1] Modify dashboard layout to check `has_store` and redirect to /onboarding in src/app/(dashboard)/layout.tsx
- [ ] T021 [US1] Build retail home page (store status card, quick stats, recent alerts placeholder) in src/app/(dashboard)/home/page.tsx
- [ ] T022 [US1] Update dashboard redirect: authenticated users with store go to /home instead of /dashboard

**Checkpoint**: User Story 1 complete — new users can onboard and get store + agents provisioned

---

## Phase 4: User Story 2 — Telegram Linking During Onboarding (Priority: P1)

**Goal**: User links Telegram in onboarding, receives personalized welcome

**Independent Test**: Complete onboarding → link Telegram → receive welcome message with store name

### Implementation

- [ ] T023 [US2] Create Telegram linking step component (reuse /api/messaging/link flow) in src/components/onboarding/telegram-step.tsx
- [ ] T024 [US2] Add Telegram step to onboarding page with "Pular por agora" option in src/app/(onboarding)/onboarding/page.tsx
- [ ] T025 [US2] Update Telegram webhook to send personalized welcome with store context after linking in src/app/api/messaging/telegram/webhook/route.ts
- [ ] T026 [US2] Add "link Telegram" banner on retail home when not linked in src/app/(dashboard)/home/page.tsx

**Checkpoint**: User Story 2 complete — Telegram linked during onboarding with personalized welcome

---

## Phase 5: User Story 3 — Fixed Specialized Agents (Priority: P1)

**Goal**: Snew routes queries to the right agent domain via retail-specific tools

**Independent Test**: Send "como ta meu estoque?" via Telegram → routed to stock tool, "quanto vendi?" → sales tool

### Implementation

- [ ] T027 [P] [US3] Create retail AI tools (STORE_QUERY_STOCK, STORE_QUERY_SALES, STORE_UPDATE_ALERT, STORE_TRIGGER_SYNC, STORE_LIST_ORDERS, STORE_UPDATE_SCHEDULE) in src/lib/ai/retail-tools.ts
- [ ] T028 [US3] Integrate retail tools into buildPlatformTools() when store exists in src/lib/ai/platform-tools.ts
- [ ] T029 [US3] Update Telegram system prompt with retail context (store name, segment, platform, capabilities) in src/lib/ai/platform-tools.ts
- [ ] T030 [US3] Make STORE_QUERY_STOCK query real data from store_products table in src/lib/ai/retail-tools.ts
- [ ] T031 [US3] Make STORE_QUERY_SALES query real data from store_orders table in src/lib/ai/retail-tools.ts

**Checkpoint**: User Story 3 complete — Telegram bot answers retail queries with domain-specific tools

---

## Phase 6: User Story 4 — Nuvemshop Integration (Priority: P2)

**Goal**: User connects Nuvemshop, products sync automatically

**Independent Test**: Connect Nuvemshop test store → verify products appear in store_products → query stock via Telegram

### Implementation

- [ ] T032 [US4] Create Nuvemshop OAuth initiate route in src/app/api/nuvemshop/connect/route.ts
- [ ] T033 [US4] Create Nuvemshop OAuth callback route (exchange code, store token, trigger sync) in src/app/api/nuvemshop/callback/route.ts
- [ ] T034 [US4] Create product sync logic (full sync + incremental) in src/lib/nuvemshop/sync.ts
- [ ] T035 [US4] Create manual sync trigger API route in src/app/api/nuvemshop/sync/route.ts
- [ ] T036 [US4] Create Nuvemshop webhook route with HMAC verification in src/app/api/nuvemshop/webhook/route.ts
- [ ] T037 [US4] Create webhook event handlers (product/updated, order/created, order/paid) in src/lib/nuvemshop/webhooks.ts
- [ ] T038 [US4] Register webhooks on Nuvemshop after successful OAuth in src/lib/nuvemshop/client.ts
- [ ] T039 [US4] Create cron endpoint for 15-minute sync fallback in src/app/api/nuvemshop/cron/route.ts
- [ ] T040 [US4] Add "Conectar Nuvemshop" button to platform step in onboarding and to retail home settings in src/components/onboarding/platform-step.tsx
- [ ] T041 [US4] Make STORE_TRIGGER_SYNC tool call the sync logic in src/lib/ai/retail-tools.ts

**Checkpoint**: User Story 4 complete — Nuvemshop connected, products synced, queryable via Telegram

---

## Phase 7: User Story 5 — Stock Alert Workflows (Priority: P2)

**Goal**: User gets Telegram alerts when stock drops below threshold

**Independent Test**: Set product stock below threshold → verify Telegram alert received

### Implementation

- [ ] T042 [US5] Create stock threshold check logic (compare store_products vs store_stock_alerts, respect per-product overrides) in src/lib/retail/stock-alerts.ts
- [ ] T043 [US5] Create Telegram alert sender for low stock (format message in PT-BR with product name, quantity, reorder prompt) in src/lib/retail/stock-alerts.ts
- [ ] T044 [US5] Hook stock alert check into product sync completion (after sync, check thresholds) in src/lib/nuvemshop/sync.ts
- [ ] T045 [US5] Hook stock alert check into Nuvemshop webhook product/updated handler in src/lib/nuvemshop/webhooks.ts
- [ ] T046 [US5] Make STORE_UPDATE_ALERT tool update thresholds (global and per-product) via Telegram in src/lib/ai/retail-tools.ts
- [ ] T047 [US5] Create default global stock alert config (threshold=5) during store provisioning in src/lib/retail/provision-store.ts

**Checkpoint**: User Story 5 complete — stock alerts working via sync + webhooks + configurable via Telegram

---

## Phase 8: User Story 6 — Daily Sales Summary (Priority: P2)

**Goal**: User receives daily Telegram sales summary at scheduled time

**Independent Test**: Trigger summary workflow → verify Telegram message with order count, revenue, top products

### Implementation

- [ ] T048 [US6] Create sales summary aggregation logic (today's orders, revenue, top 3 products, comparison with yesterday) in src/lib/retail/sales-summary.ts
- [ ] T049 [US6] Create Telegram sales summary message formatter (PT-BR, emoji, mobile-friendly) in src/lib/retail/sales-summary.ts
- [ ] T050 [US6] Create scheduled cron endpoint for daily summary (runs at configured time per store) in src/app/api/store/daily-summary/route.ts
- [ ] T051 [US6] Make STORE_UPDATE_SCHEDULE tool update the scheduled time via Telegram in src/lib/ai/retail-tools.ts
- [ ] T052 [US6] Auto-create daily summary workflow (default 21:00 BRT) during store provisioning when "resumo_de_vendas" priority selected in src/lib/retail/provision-store.ts

**Checkpoint**: User Story 6 complete — daily summaries delivered at scheduled time

---

## Phase 9: User Story 7 — New Order Notifications (Priority: P3)

**Goal**: User gets instant Telegram notification on new orders

**Independent Test**: Create test order on Nuvemshop → verify Telegram notification with order details

### Implementation

- [ ] T053 [US7] Create order notification formatter (PT-BR: order #, customer name, items, total) in src/lib/retail/order-notifications.ts
- [ ] T054 [US7] Hook order notification into Nuvemshop order/created webhook handler in src/lib/nuvemshop/webhooks.ts
- [ ] T055 [US7] Store new orders in store_orders table from webhook data in src/lib/nuvemshop/webhooks.ts
- [ ] T056 [US7] Add enable/disable order notifications via Telegram ("para de notificar pedidos") in src/lib/ai/retail-tools.ts

**Checkpoint**: User Story 7 complete — instant order notifications via Telegram

---

## Phase 10: User Story 8 — Competitor Price Monitoring (Priority: P3)

**Goal**: User can set up price monitors via Telegram and get alerts on price changes

**Independent Test**: Set up price monitor via Telegram → simulate price change → verify alert

### Implementation

- [ ] T057 [US8] Create price monitor CRUD logic (create, list, deactivate) in src/lib/retail/price-monitors.ts
- [ ] T058 [US8] Create web scraping function for marketplace price checks in src/lib/retail/price-scraper.ts
- [ ] T059 [US8] Create cron endpoint for periodic price checks in src/app/api/store/price-check/route.ts
- [ ] T060 [US8] Create Telegram price change alert formatter in src/lib/retail/price-monitors.ts
- [ ] T061 [US8] Add STORE_MONITOR_PRICE and STORE_STOP_MONITOR tools for Telegram in src/lib/ai/retail-tools.ts

**Checkpoint**: User Story 8 complete — competitor price monitoring via Telegram

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Integration, error handling, and cleanup

- [ ] T062 Handle Nuvemshop 401 errors (token revoked) — mark store disconnected, alert user via Telegram in src/lib/nuvemshop/client.ts
- [ ] T063 Add error recovery for failed syncs (retry logic, stale detection) in src/lib/nuvemshop/sync.ts
- [ ] T064 Ensure all new API routes have proper auth checks (service role for webhooks, user auth for others)
- [ ] T065 Add loading states and error handling to onboarding UI components
- [ ] T066 Verify `bun run build` passes with zero errors
- [ ] T067 Verify `bun run lint` passes with zero warnings
- [ ] T068 Run quickstart.md validation — test full flow end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (migrations applied)
- **Phase 3 (US1 Onboarding)**: Depends on Phase 2
- **Phase 4 (US2 Telegram)**: Depends on Phase 3 (onboarding page exists)
- **Phase 5 (US3 Agents/Tools)**: Depends on Phase 2 (can run parallel with US1/US2)
- **Phase 6 (US4 Nuvemshop)**: Depends on Phase 2 (can run parallel with US1-US3)
- **Phase 7 (US5 Stock Alerts)**: Depends on Phase 6 (needs synced products)
- **Phase 8 (US6 Daily Summary)**: Depends on Phase 6 (needs synced orders)
- **Phase 9 (US7 Order Notifications)**: Depends on Phase 6 (needs Nuvemshop webhook)
- **Phase 10 (US8 Price Monitors)**: Depends on Phase 2 only (independent of Nuvemshop)
- **Phase 11 (Polish)**: Depends on all desired phases complete

### Parallel Opportunities

```
After Phase 2 completion:

  Agent A: Phase 3 (US1) → Phase 4 (US2) → Phase 11
  Agent B: Phase 5 (US3) → Phase 7 (US5) → Phase 8 (US6)
  Agent C: Phase 6 (US4) → Phase 9 (US7) → Phase 10 (US8)
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Phase 1: Setup (all migrations)
2. Phase 2: Foundational (provisioning logic, Nuvemshop client)
3. Phase 3: US1 — Onboarding works, store + agents created
4. Phase 4: US2 — Telegram linked with personalized welcome
5. Phase 5: US3 — Retail tools work (with mock data until Nuvemshop connected)
6. **STOP and VALIDATE**: Full onboarding → Telegram → retail queries flow

### Full Delivery

7. Phase 6: US4 — Nuvemshop integration (real data)
8. Phase 7-9: US5/6/7 — Automated alerts and summaries
9. Phase 10: US8 — Competitor monitoring
10. Phase 11: Polish

---

## Notes

- All new files in TypeScript strict mode
- All text user-facing in Portuguese (PT-BR) by default
- Use `cn()` for dynamic classes, shadcn components for UI
- Commit after each phase or logical group of tasks
- Total tasks: 68
