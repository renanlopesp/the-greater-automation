# Implementation Plan: Retail Intelligence - RFM & ABC

**Branch**: `028-retail-intelligence` | **Date**: 2026-02-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/028-retail-intelligence/spec.md`

## Summary

Add two new analytics tools (STORE_ANALYZE_CUSTOMERS and STORE_ANALYZE_PRODUCTS) to the existing retail toolkit. Both tools fetch data from the Nuvemshop API at runtime (same pattern as STORE_FORECAST_DEMAND) and perform in-memory analysis — no new database tables, API routes, or dependencies needed. The only file modified is `src/lib/ai/retail-tools.ts`.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Vercel AI SDK (`jsonSchema`), `@/lib/nuvemshop/client` (NuvemshopClient), `@/lib/supabase/server` (createServiceRoleClient)
**Storage**: Nuvemshop API (orders, customers) + Supabase store_products (cost_price only)
**Testing**: Manual via Telegram bot and agent chat (existing retail tool testing pattern)
**Target Platform**: Node.js server (Next.js API routes / AI SDK tool execution)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Results within 30 seconds for stores with up to 500 orders
**Constraints**: No new dependencies, no new DB tables, single-file change
**Scale/Scope**: 1 file modified, 2 tools added (~400-500 lines total)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Applies? | Status | Notes                                                                                         |
| ------------------------------ | -------- | ------ | --------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | No       | N/A    | No pages or layouts involved                                                                  |
| II. shadcn/ui Component System | No       | N/A    | No UI components involved                                                                     |
| III. Tailwind CSS v4 + OKLCH   | No       | N/A    | No styling involved                                                                           |
| IV. TypeScript Strict Mode     | Yes      | PASS   | All code in strict TypeScript with Zod for API data                                           |
| V. Simplicity and YAGNI        | Yes      | PASS   | No new abstractions — tools added inline to existing function, same pattern as existing tools |
| VI. Supabase as Backend        | Yes      | PASS   | Supabase used only for cost_price lookup (existing table). No new tables.                     |

**Result**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/028-retail-intelligence/
├── spec.md
├── plan.md              # This file
├── research.md          # RFM methodology, ABC thresholds, data strategy
├── data-model.md        # Computed entities (in-memory, not persisted)
├── quickstart.md        # Test plan and verification checklist
├── contracts/
│   └── tool-schemas.md  # Input/output schemas for both tools
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/lib/ai/retail-tools.ts    # ONLY file modified — add 2 tools to buildRetailTools()
```

**Structure Decision**: No new files. Both tools are added as properties of the object returned by `buildRetailTools()`, following the exact same pattern as the 15+ existing STORE\_\* tools. This is the simplest approach that maintains consistency.

## Implementation Phases

### Phase 1: STORE_ANALYZE_CUSTOMERS (RFM + Repurchase)

**File**: `src/lib/ai/retail-tools.ts`
**Insert after**: STORE_FORECAST_DEMAND tool (line ~2832)

**Logic**:

1. Fetch store credentials from Supabase (same pattern as all STORE\_\* tools)
2. Fetch all orders in the analysis period via `client.getOrders()` with pagination
3. Group orders by `customer.email` — compute per-customer: last order date, order count, total spent
4. Calculate RFM scores using quintile method (sort each dimension, divide into 5 equal groups)
5. Map RFM scores to segments using the decision table from research.md
6. For repurchase focus: calculate average purchase interval per customer, identify overdue customers
7. Format output with segment summaries and actionable recommendations

**Helper functions** (defined above `buildRetailTools()`):

- `calculateQuintiles(values: number[]): number[]` — returns score 1-5 for each value
- `mapRfmSegment(r: number, f: number, m: number): string` — returns segment label
- `calculateRepurchaseData(orderDates: string[]): { avgInterval: number; daysOverdue: number } | null`

### Phase 2: STORE_ANALYZE_PRODUCTS (ABC + Dead Stock)

**File**: `src/lib/ai/retail-tools.ts`
**Insert after**: STORE_ANALYZE_CUSTOMERS tool

**Logic**:

1. Fetch store credentials (same pattern)
2. Fetch all orders in the analysis period via `client.getOrders()` with pagination
3. Aggregate revenue and units sold by `product_id`
4. Sort by revenue descending, calculate cumulative % → assign A/B/C class
5. Fetch current stock for classified products via `client.getProduct()` (batched, 10 concurrent — same as STORE_FORECAST_DEMAND)
6. Fetch cost_price from `store_products` table via Supabase for margin analysis
7. Identify dead stock: products from `client.getAllProducts()` with stock > 0 that have zero sales in the period
8. Calculate turnover rate: units_sold / current_stock
9. Format output with class summaries, dead stock list, and actionable recommendations

**Helper functions**:

- `classifyABC(products: { revenue: number }[]): ("A" | "B" | "C")[]` — assigns class based on cumulative revenue

### Phase 3: Verification

1. `bun run build` — must pass
2. `bun run lint` — must pass
3. Manual test via Telegram bot with a store that has order history
4. Verify edge cases: no orders, single customer, missing cost_price

## Complexity Tracking

No constitution violations. No complexity justification needed.
