# Tasks: Retail Intelligence - RFM Segmentation & ABC Analysis

**Input**: Design documents from `/specs/028-retail-intelligence/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — manual verification via Telegram bot and agent chat.

**Organization**: Tasks grouped by user story. All tasks modify a single file: `src/lib/ai/retail-tools.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All tasks target `src/lib/ai/retail-tools.ts` unless otherwise noted

---

## Phase 1: Setup (Helper Functions)

**Purpose**: Shared utility functions needed by both tools

- [ ] T001 Add `calculateQuintiles(values: number[]): number[]` helper function above `buildRetailTools()` in `src/lib/ai/retail-tools.ts` — takes an array of numeric values, returns array of scores 1-5 using quintile bucketing (divide sorted values into 5 equal groups, assign score based on bucket)
- [ ] T002 Add `mapRfmSegment(r: number, f: number, m: number): string` helper function in `src/lib/ai/retail-tools.ts` — maps RFM scores (1-5 each) to segment labels (VIP, Loyal, Promising, At Risk, Lost, New) per decision table in `specs/028-retail-intelligence/research.md`
- [ ] T003 Add `calculateRepurchaseData(orderDates: string[]): { avgInterval: number; daysOverdue: number } | null` helper function in `src/lib/ai/retail-tools.ts` — takes array of ISO date strings, returns average interval between orders and days overdue (null if < 2 orders). Overdue = days_since_last > avg_interval \* 1.2

**Checkpoint**: Helper functions ready — tool implementation can begin

---

## Phase 2: User Story 1 - Customer RFM Analysis (Priority: P1) MVP

**Goal**: Store owners can segment customers by value (VIP, Loyal, At Risk, Lost, New) and get actionable recommendations via agent chat or Telegram.

**Independent Test**: Ask agent "analise meus clientes" or "quem sao meus melhores clientes?" → returns customers grouped by segment with RFM scores and action suggestions.

### Implementation for User Story 1

- [ ] T004 [US1] Add `STORE_ANALYZE_CUSTOMERS` tool definition with inputSchema (days: number default 90 max 365, focus: enum overview/repurchase/at_risk, limit: number default 10) to `buildRetailTools()` in `src/lib/ai/retail-tools.ts` — insert after STORE_FORECAST_DEMAND (~line 2832). Include tool description with Portuguese trigger phrases: "analise meus clientes", "segmentacao de clientes", "quem sao meus melhores clientes?", "clientes em risco"
- [ ] T005 [US1] Implement `STORE_ANALYZE_CUSTOMERS` execute function — data fetching phase: fetch store credentials from Supabase, fetch all orders in analysis period via `client.getOrders()` with pagination (200/page, same pattern as STORE_FORECAST_DEMAND), group orders by `customer.email` computing per-customer totals (last_order_date, order_count, total_spent, order_dates array). Handle edge cases: no orders (friendly message), null customer email (exclude + report count)
- [ ] T006 [US1] Implement `STORE_ANALYZE_CUSTOMERS` execute function — RFM scoring phase: extract recency (days since last order), frequency (order count), monetary (total spent) arrays. Call `calculateQuintiles()` for each dimension. Call `mapRfmSegment()` per customer. Group customers by segment
- [ ] T007 [US1] Implement `STORE_ANALYZE_CUSTOMERS` execute function — output formatting: for focus="overview", return resumo (periodo, pedidos_analisados, clientes_unicos, pedidos_sem_cliente) + segmentos object (per segment: total, receita_total, pct_receita, clientes array limited by `limit` param) + acoes_sugeridas array with actionable Portuguese recommendations per contract in `specs/028-retail-intelligence/contracts/tool-schemas.md`

**Checkpoint**: RFM overview analysis works end-to-end

---

## Phase 3: User Story 3 - Repurchase Prediction (Priority: P2)

**Goal**: Store owners can identify customers overdue for repurchase and those likely to buy soon.

**Independent Test**: Ask agent "tem alguem pra mandar cupom?" or "quais clientes devem comprar em breve?" → returns overdue and upcoming repurchase lists.

### Implementation for User Story 3

- [ ] T008 [US3] Implement repurchase focus in `STORE_ANALYZE_CUSTOMERS` — for focus="repurchase": call `calculateRepurchaseData()` per customer (needs >= 2 orders), split into recompra_atrasada (overdue) and recompra_proxima (within 5 days of expected interval), format output per contract. For focus="at_risk": filter to show only At Risk + Lost segments from the RFM overview

**Checkpoint**: All STORE_ANALYZE_CUSTOMERS focus modes work

---

## Phase 4: User Story 2 - Product ABC/Pareto Analysis (Priority: P1)

**Goal**: Store owners can identify which products drive revenue (A), which are marginal (B/C), and which are dead stock tying up capital.

**Independent Test**: Ask agent "quais produtos sao mais importantes?" or "tem estoque parado?" → returns ABC classification with revenue contribution and dead stock list.

### Implementation for User Story 2

- [ ] T009 [US2] Add `STORE_ANALYZE_PRODUCTS` tool definition with inputSchema (days: number default 30 max 365, include_dead_stock: boolean default true, limit: number default 15) to `buildRetailTools()` in `src/lib/ai/retail-tools.ts` — insert after STORE_ANALYZE_CUSTOMERS. Include description with Portuguese triggers: "analise meus produtos", "curva ABC", "quais produtos mais vendem?", "estoque parado", "produtos classe A"
- [ ] T010 [US2] Implement `STORE_ANALYZE_PRODUCTS` execute function — data fetching and aggregation: fetch store credentials, fetch all orders in period via `client.getOrders()` with pagination, aggregate revenue and units_sold by `product_id`. Sort by revenue descending, calculate cumulative revenue percentage, assign A/B/C class (A: up to 80%, B: 80-95%, C: 95-100%)
- [ ] T011 [US2] Implement `STORE_ANALYZE_PRODUCTS` execute function — stock and margin enrichment: fetch current stock for classified products via `client.getProduct()` batched 10 concurrent (same as STORE_FORECAST_DEMAND pattern), fetch cost_price from Supabase `store_products` table for margin calculation. Compute turnover_rate (units_sold / current_stock) and margin_pct ((price - cost) / price \* 100). Handle missing cost_price gracefully (skip margin for those products)
- [ ] T012 [US2] Implement `STORE_ANALYZE_PRODUCTS` execute function — dead stock identification: if include_dead_stock=true, fetch all products via `client.getAllProducts()`, cross-reference with sales data to find products with stock > 0 and zero sales in period. Calculate stock_value (stock \* price) and days_since_last_sale if available from order data
- [ ] T013 [US2] Implement `STORE_ANALYZE_PRODUCTS` execute function — output formatting: return resumo (periodo, pedidos_analisados, produtos_vendidos, receita_total) + classificacao (per class: total_produtos, pct_catalogo, receita, pct_receita, margem_media, produtos array limited by `limit`) + estoque_parado array + acoes_sugeridas with actionable Portuguese recommendations per contract

**Checkpoint**: ABC analysis with dead stock identification works end-to-end

---

## Phase 5: Polish & Verification

**Purpose**: Ensure everything builds and works together

- [ ] T014 Run `bun run build` and fix any TypeScript errors in `src/lib/ai/retail-tools.ts`
- [ ] T015 Run `bun run lint` and fix any lint warnings in `src/lib/ai/retail-tools.ts`
- [ ] T016 Run quickstart.md validation checklist — verify both tools via manual testing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1 - RFM)**: Depends on Phase 1 (T001-T003 helpers)
- **Phase 3 (US3 - Repurchase)**: Depends on Phase 2 (T004-T007 — repurchase extends the same tool)
- **Phase 4 (US2 - ABC)**: Depends on Phase 1 only (T001-T003 helpers). Can run in PARALLEL with Phase 2
- **Phase 5 (Polish)**: Depends on all phases complete

### Within Each Phase

- T001, T002, T003 are independent helpers — can be written together since same file
- T004 → T005 → T006 → T007: sequential (each builds on previous in same function)
- T009 → T010 → T011 → T012 → T013: sequential (each builds on previous in same function)

### Parallel Opportunities

Since all tasks modify the same file (`retail-tools.ts`), parallelism is limited. However:

- Phase 2 (US1) and Phase 4 (US2) could theoretically be parallelized if tools are written in separate sections of the file
- In practice, sequential implementation P1 → P2 → P3 is recommended for a single-file feature

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Helper functions (T001-T003)
2. Complete Phase 2: STORE_ANALYZE_CUSTOMERS overview (T004-T007)
3. **STOP and VALIDATE**: Test via Telegram — "analise meus clientes"
4. If working, continue to Phase 3-4

### Full Delivery

1. Phase 1: Helpers → Phase 2: RFM → Phase 3: Repurchase → Phase 4: ABC → Phase 5: Verify
2. Each phase adds independently valuable capability
3. Total: 16 tasks, ~400-500 lines of code, single file modification

---

## Notes

- All tasks modify `src/lib/ai/retail-tools.ts` — commit after each phase for clean history
- Follow existing STORE_FORECAST_DEMAND pattern for data fetching, pagination, error handling
- Output in Portuguese (same as all existing retail tools)
- All monetary values formatted as "R$ X.XXX,XX"
