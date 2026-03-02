# Data Model: Retail Intelligence

No new database tables are required. Both tools operate on data fetched at runtime from the Nuvemshop API and existing Supabase tables.

## Data Sources

### Nuvemshop API (runtime fetch)

**Orders** (via `client.getOrders()`):

- `id`: number
- `customer.email`: string | null — **primary key for RFM grouping**
- `customer.name`: string | null
- `total`: string (e.g., "149.90")
- `status`: string (open/closed/cancelled)
- `products[]`: array of order items (product_id, name, quantity, price)
- `created_at`: ISO string

**Customers** (via `client.getAllCustomers()`):

- `id`: number
- `name`: string
- `email`: string
- `phone`: string | null
- `total_spent`: string
- `created_at`: ISO string

### Supabase (existing tables)

**store_products** (for margin analysis only):

- `name`: string
- `sku`: string | null
- `price`: number
- `cost_price`: number | null — **needed for margin calculation**
- `stock_quantity`: number
- `is_published`: boolean
- `store_id`: UUID

## Computed Entities (in-memory, not persisted)

### CustomerRFM

```
{
  email: string
  name: string
  recency_days: number        // days since last order
  frequency: number           // total order count
  monetary: number            // total spent (sum of order totals)
  r_score: 1-5               // quintile score
  f_score: 1-5               // quintile score
  m_score: 1-5               // quintile score
  segment: "VIP" | "Loyal" | "Promising" | "At Risk" | "Lost" | "New"
  last_order_date: string
  avg_purchase_interval?: number  // days between orders (null if < 2 orders)
  days_overdue?: number           // days past expected purchase (null if not overdue)
}
```

### ProductABC

```
{
  product_id: number
  name: string
  revenue: number              // total revenue in period
  revenue_share: number        // % of total revenue
  cumulative_share: number     // running % total
  class: "A" | "B" | "C"
  units_sold: number
  current_stock: number
  turnover_rate: number        // units_sold / current_stock
  margin_pct?: number          // (price - cost) / price * 100 (null if no cost_price)
  cost_price?: number
  selling_price: number
  days_since_last_sale?: number
}
```

### DeadStockItem

```
{
  product_id: number
  name: string
  sku?: string
  stock_quantity: number
  selling_price: number
  stock_value: number          // stock * price
  days_since_last_sale: number | null  // null if never sold
}
```
