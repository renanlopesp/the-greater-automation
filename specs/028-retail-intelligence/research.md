# Research: Retail Intelligence - RFM & ABC

## R1: RFM Scoring Methodology

**Decision**: Quintile-based scoring (1-5) per dimension with fixed segment mapping.

**Rationale**: Quintile scoring adapts to each store's data distribution automatically. A store with 50 customers and a store with 5000 customers both get meaningful 1-5 scores because quintiles are relative to the dataset. This is the standard approach used by Shopify, Klaviyo, and most retail analytics platforms.

**Scoring**:

- **Recency (R)**: Days since last order. Lower = better. Score 5 = most recent quintile.
- **Frequency (F)**: Total order count in period. Higher = better. Score 5 = most frequent quintile.
- **Monetary (M)**: Total spent in period. Higher = better. Score 5 = highest spenders.

**Segment Mapping**:
| Segment | R Score | F Score | M Score | Description |
|---------|---------|---------|---------|-------------|
| VIP | 4-5 | 4-5 | 4-5 | Recent, frequent, high-spend |
| Loyal | 3-5 | 3-5 | 3-5 | Consistent buyers (not VIP) |
| Promising | 4-5 | 1-2 | 3-5 | Recent, few orders, decent spend |
| At Risk | 1-2 | 3-5 | 3-5 | Was loyal/VIP, hasn't bought recently |
| Lost | 1-2 | 1-5 | 1-5 | Long time since last purchase |
| New | 4-5 | 1 | 1-5 | Single recent order |

**Alternatives considered**:

- K-means clustering: More sophisticated but harder to explain to store owners and requires tuning
- Fixed thresholds (e.g., "last 30 days" = recent): Doesn't adapt to different store sizes/volumes
- Percentile-based: Essentially the same as quintiles but with 100 buckets — unnecessary granularity

## R2: Repurchase Interval Calculation

**Decision**: Average days between consecutive orders per customer. Minimum 2 orders required.

**Rationale**: Simple, interpretable, and actionable. A customer who buys every 28 days on average and hasn't bought in 35 days is clearly "overdue". No ML needed.

**Calculation**: For a customer with orders on days [D1, D2, D3, D4]:

- Intervals: [D2-D1, D3-D2, D4-D3]
- Average interval = mean of intervals
- Days since last = today - D4
- Overdue = days_since_last > average_interval \* 1.2 (20% buffer)

**Alternatives considered**:

- Exponential smoothing: Better for trends but overkill for first version
- Per-product interval: More accurate for consumables but requires product-level tracking — future enhancement

## R3: ABC Classification Thresholds

**Decision**: Standard 80/15/5 cumulative revenue split.

**Rationale**: This is the textbook Pareto principle applied to inventory management. Industry standard used by SAP, Oracle, and most ERP systems. Products are sorted by revenue descending, cumulative % calculated, and classified:

- **A**: Products until cumulative revenue reaches 80%
- **B**: Next products until cumulative reaches 95%
- **C**: Remaining products (bottom 5% of revenue)

**Alternatives considered**:

- 70/20/10: More conservative, spreads items more evenly — less actionable
- Dynamic thresholds: Could analyze the natural break points in the data — over-engineering for V1

## R4: Stock Turnover Rate

**Decision**: Simple turnover = units_sold_in_period / current_stock. Point-in-time calculation.

**Rationale**: Average stock would require historical stock snapshots we don't have. Current stock is the best available proxy and is sufficient for identifying fast-movers vs. slow-movers.

**Interpretation**: Turnover > 1 means the product sold more than current stock in the period (fast mover). Turnover < 0.1 means less than 10% of stock moved (potential dead stock).

## R5: Data Fetching Strategy

**Decision**: Fetch directly from Nuvemshop API (same pattern as STORE_FORECAST_DEMAND), not from local sync tables.

**Rationale**:

- Fresh data guaranteed (no sync lag)
- Consistent with existing tool patterns
- Orders include customer email for RFM grouping
- store_products from Supabase only needed for cost_price (margin analysis)
- Pagination at 200/page handles stores with up to ~2000 orders efficiently

**Performance**: For a store with 500 orders:

- ~3 API calls to fetch orders (200/page)
- ~1 API call to fetch all customers
- ~1 Supabase query for cost_price data
- Total: ~5 network calls, well within 30s target
