# Feature Specification: Retail Intelligence - RFM Segmentation & ABC Analysis

**Feature Branch**: `028-retail-intelligence`
**Created**: 2026-02-27
**Status**: Draft
**Input**: Two new STORE\_\* analytics tools that leverage existing order and product data to provide customer segmentation (RFM) and product classification (ABC/Pareto) insights.

## User Scenarios & Testing

### User Story 1 - Customer RFM Analysis (Priority: P1)

A store owner asks their agent via Telegram: "quem sao meus melhores clientes?" or "quais clientes estao sumindo?". The agent calls STORE_ANALYZE_CUSTOMERS, which fetches order history from the Nuvemshop API, groups orders by customer email, calculates Recency/Frequency/Monetary scores, and classifies each customer into segments (VIP, Loyal, At Risk, Lost, New). The agent responds with a formatted summary showing each segment and actionable recommendations.

**Why this priority**: Customer retention is 5-7x cheaper than acquisition. RFM analysis enables targeted actions (cupons for at-risk customers, VIP perks for top buyers) using data that already exists.

**Independent Test**: Can be fully tested by calling the tool with a store that has order history and verifying customers are correctly classified into segments with actionable data.

**Acceptance Scenarios**:

1. **Given** a store with 50+ orders across 10+ customers over 90 days, **When** the agent calls STORE_ANALYZE_CUSTOMERS, **Then** it returns customers grouped by segment (VIP, Loyal, Promising, At Risk, Lost, New) with R/F/M scores and actionable recommendations per segment.
2. **Given** a store with no orders, **When** the agent calls STORE_ANALYZE_CUSTOMERS, **Then** it returns a friendly message explaining that order history is needed.
3. **Given** a store owner asks "quais clientes preciso reconquistar?", **When** the agent processes the request, **Then** it calls the tool and highlights the "At Risk" and "Lost" segments with repurchase interval data.

---

### User Story 2 - Product ABC/Pareto Analysis (Priority: P1)

A store owner asks "quais produtos sao mais importantes pro meu faturamento?" or "quais produtos nao vendem?". The agent calls STORE_ANALYZE_PRODUCTS, which fetches order history, aggregates revenue by product, calculates cumulative revenue contribution, and classifies products into A (top ~80% revenue), B (next ~15%), and C (bottom ~5%). It also identifies dead stock (products with stock but zero sales in the period).

**Why this priority**: Pareto analysis is the foundation for inventory decisions (invest more in A, reduce C), pricing strategy, and identifying dead stock that ties up capital.

**Independent Test**: Can be fully tested by calling the tool with a store that has sales history and verifying products are correctly classified with revenue contribution percentages.

**Acceptance Scenarios**:

1. **Given** a store with 30+ products and 60+ orders over 30 days, **When** the agent calls STORE_ANALYZE_PRODUCTS, **Then** it returns products classified as A/B/C with revenue contribution, margin (when cost_price exists), and stock turnover rate.
2. **Given** a store with products that have cost_price set, **When** the tool runs, **Then** it includes margin analysis per class (average margin for A vs B vs C products).
3. **Given** products with stock > 0 but zero sales in the analysis period, **When** the tool runs, **Then** it identifies them as "dead stock" with stock value and days since last sale.

---

### User Story 3 - Repurchase Prediction (Priority: P2)

A store owner asks "quais clientes devem comprar em breve?" or "tem alguem pra eu mandar cupom?". The agent uses STORE_ANALYZE_CUSTOMERS with the repurchase parameter, which calculates individual purchase intervals per customer and identifies those who are overdue for their next purchase.

**Why this priority**: Proactive repurchase outreach drives repeat revenue with minimal effort, especially for consumable products (pet food, cosmetics, supplements).

**Independent Test**: Can be tested by calling the tool with repurchase focus and verifying it identifies customers whose days since last purchase exceeds their average purchase interval.

**Acceptance Scenarios**:

1. **Given** a customer who buys every ~30 days and last bought 35 days ago, **When** the tool runs with repurchase focus, **Then** it flags this customer as "overdue" with the expected interval and days overdue.
2. **Given** a customer with only 1 order, **When** the tool runs, **Then** it excludes them from repurchase predictions (insufficient data) but still includes them in RFM segments as "New".

---

### Edge Cases

- What happens when a store has very few orders (< 10)? Tool returns results but warns that segments may be unreliable with small sample sizes.
- What happens when all orders are from the same customer? Tool still works but produces a single-customer segment distribution.
- What happens when orders have null/missing customer email? Those orders are excluded from RFM analysis (cannot group without identifier) and a count of excluded orders is reported.
- What happens when products have no cost_price? ABC analysis works on revenue only; margin analysis is skipped for those products with a note.
- What happens with very large order volumes (1000+ orders)? The tool paginates efficiently (200 per page, same as STORE_FORECAST_DEMAND) and processes in memory.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a STORE_ANALYZE_CUSTOMERS tool that calculates RFM scores using order history from the Nuvemshop API.
- **FR-002**: System MUST classify customers into segments based on RFM scores: VIP (high R, high F, high M), Loyal (medium-high R, high F), Promising (high R, low F, medium-high M), At Risk (low R, medium-high F, medium-high M), Lost (very low R, any F/M), New (high R, single order).
- **FR-003**: System MUST calculate repurchase predictions based on individual customer purchase intervals (average days between orders).
- **FR-004**: System MUST support configurable analysis period (default: 90 days, max: 365 days) for both tools.
- **FR-005**: System MUST provide a STORE_ANALYZE_PRODUCTS tool that classifies products by revenue contribution using ABC/Pareto analysis.
- **FR-006**: ABC classification MUST use cumulative revenue thresholds: A = top products contributing ~80% of revenue, B = next ~15%, C = remaining ~5%.
- **FR-007**: Product analysis MUST include margin analysis (gross margin per product and per class average) when cost_price data is available in store_products.
- **FR-008**: Product analysis MUST identify dead stock: products with stock > 0 but zero sales in the analysis period.
- **FR-009**: Product analysis MUST calculate stock turnover rate (units sold / average stock) for each product.
- **FR-010**: Both tools MUST format output for Telegram readability (concise, categorized, with actionable summaries).
- **FR-011**: Both tools MUST handle stores with no orders gracefully, returning a helpful message.
- **FR-012**: RFM analysis MUST group orders by customer email (the identifier available in the Nuvemshop order API).
- **FR-013**: Both tools MUST follow existing retail-tools.ts patterns: same store credential fetching, NuvemshopClient instantiation, error handling, and pagination.

### Key Entities

- **Customer Segment**: A classification (VIP, Loyal, Promising, At Risk, Lost, New) derived from RFM scoring. Each customer has R/F/M scores (1-5 scale), segment label, total spent, order count, and days since last order.
- **Repurchase Prediction**: Per-customer data including average purchase interval (days), days since last purchase, and overdue status (boolean).
- **Product Classification**: A/B/C label derived from cumulative revenue contribution. Each product has revenue, revenue share %, cumulative share %, margin (if cost_price available), stock quantity, turnover rate, and days since last sale.
- **Dead Stock Item**: A product with stock_quantity > 0 but zero units sold in the analysis period. Includes stock value (stock \* price) and capital tied up.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Store owners can identify their top 20% customers (by value) within a single agent interaction.
- **SC-002**: Store owners can identify at-risk customers who haven't purchased recently relative to their buying pattern.
- **SC-003**: Store owners can identify which products generate 80% of their revenue vs. the long tail.
- **SC-004**: Store owners can identify dead stock (products with inventory but no sales) and the capital tied up.
- **SC-005**: Both tools return results within 30 seconds for stores with up to 500 orders in the analysis period.
- **SC-006**: Analysis results include actionable recommendations (not just data), enabling store owners to take immediate action (send cupons, restock, discount dead stock).

## Assumptions

- Customer email from the Nuvemshop order API is a reliable unique identifier for grouping orders by customer. Orders without customer email are excluded.
- RFM quintile scoring (1-5 per dimension) with segment mapping follows standard retail analytics methodology.
- ABC thresholds of 80/15/5 are reasonable defaults for most retail catalogs. These are not configurable in the first version.
- Stock turnover rate is calculated using total units sold in the period divided by current stock quantity (point-in-time, not average).
- The tool fetches data directly from the Nuvemshop API (same pattern as STORE_FORECAST_DEMAND) rather than from local sync tables, ensuring fresh data.
- Cost_price from store_products (local DB) is used for margin calculations since the Nuvemshop API does not expose cost prices.
