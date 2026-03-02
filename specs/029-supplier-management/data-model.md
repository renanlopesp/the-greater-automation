# Data Model: Gestao de Fornecedores

**Feature**: 029-supplier-management | **Date**: 2026-03-02

## Entity: store_suppliers

Central supplier registry. One supplier belongs to one store.

| Column          | Type          | Constraints                     | Description                  |
| --------------- | ------------- | ------------------------------- | ---------------------------- |
| id              | UUID          | PK, DEFAULT gen_random_uuid()   | Unique identifier            |
| store_id        | UUID          | NOT NULL, FK stores(id) CASCADE | Parent store                 |
| name            | TEXT          | NOT NULL                        | Supplier company name        |
| contact_email   | TEXT          |                                 | Contact email                |
| contact_phone   | TEXT          |                                 | Contact phone                |
| lead_time_days  | INTEGER       | NOT NULL, CHECK > 0             | Delivery lead time in days   |
| min_order_value | NUMERIC(10,2) |                                 | Minimum order value in BRL   |
| payment_terms   | TEXT          |                                 | Free-text payment conditions |
| notes           | TEXT          |                                 | General notes                |
| is_active       | BOOLEAN       | NOT NULL DEFAULT true           | Soft delete flag             |
| created_at      | TIMESTAMPTZ   | NOT NULL DEFAULT now()          | Creation timestamp           |
| updated_at      | TIMESTAMPTZ   | NOT NULL DEFAULT now()          | Last update timestamp        |

**Indexes**:

- `idx_store_suppliers_store_id` on (store_id)
- `idx_store_suppliers_active` on (store_id, is_active) WHERE is_active = true

**RLS** (via store → team_members chain):

- SELECT: team members can view their store's suppliers
- INSERT/UPDATE: team owners/admins only
- DELETE: not allowed (soft delete via is_active)
- Service role: full access

**Trigger**: `set_updated_at` BEFORE UPDATE

## Entity: store_product_suppliers

N:N link between products and suppliers with cost and preference data.

| Column         | Type          | Constraints                              | Description                                 |
| -------------- | ------------- | ---------------------------------------- | ------------------------------------------- |
| id             | UUID          | PK, DEFAULT gen_random_uuid()            | Unique identifier                           |
| store_id       | UUID          | NOT NULL, FK stores(id) CASCADE          | Parent store (denormalized for RLS)         |
| supplier_id    | UUID          | NOT NULL, FK store_suppliers(id) CASCADE | Linked supplier                             |
| product_id     | UUID          | NOT NULL, FK store_products(id) CASCADE  | Linked product                              |
| cost_price     | NUMERIC(10,2) |                                          | Supplier's cost price for this product      |
| is_preferred   | BOOLEAN       | NOT NULL DEFAULT false                   | Preferred supplier flag (max 1 per product) |
| last_order_at  | TIMESTAMPTZ   |                                          | Last purchase date                          |
| last_order_qty | INTEGER       |                                          | Last purchase quantity                      |
| created_at     | TIMESTAMPTZ   | NOT NULL DEFAULT now()                   | Creation timestamp                          |
| updated_at     | TIMESTAMPTZ   | NOT NULL DEFAULT now()                   | Last update timestamp                       |

**Indexes**:

- `idx_sps_store_id` on (store_id)
- `idx_sps_supplier_id` on (supplier_id)
- `idx_sps_product_id` on (product_id)
- UNIQUE on (supplier_id, product_id) — prevents duplicate links

**RLS** (via store → team_members chain):

- SELECT: team members can view their store's links
- INSERT/UPDATE: team owners/admins only
- DELETE: team owners/admins only (hard delete for unlinking)
- Service role: full access

**Trigger**: `set_updated_at` BEFORE UPDATE

## Relationships

```
stores (1) ──── (N) store_suppliers
stores (1) ──── (N) store_products        [existing]
store_suppliers (1) ──── (N) store_product_suppliers
store_products  (1) ──── (N) store_product_suppliers
```

## Calculated Entity: Reorder Suggestion (not persisted)

Computed at query time from existing data:

| Field           | Source          | Calculation                                                                                            |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| product         | store_products  | name, stock_quantity, price                                                                            |
| supplier        | store_suppliers | name, lead_time_days, min_order_value                                                                  |
| avg_daily_sales | store_orders    | SUM(quantity) / days in period                                                                         |
| days_of_stock   | computed        | stock_quantity / avg_daily_sales                                                                       |
| reorder_point   | computed        | avg_daily_sales × lead_time_days × 1.2                                                                 |
| suggested_qty   | computed        | avg_daily_sales × 30                                                                                   |
| urgency         | computed        | "critical" if days_of_stock < lead_time_days, "warning" if < lead_time_days × 1.5, "healthy" otherwise |
| order_by_date   | computed        | today + (days_of_stock - lead_time_days) days                                                          |

## Validation Rules

- **Supplier name**: required, min 2 chars
- **Lead time**: required, integer > 0, max 365
- **Min order value**: optional, >= 0
- **Cost price** (link): optional, >= 0
- **is_preferred**: only one per product (enforced at application level — on set preferred, unset previous)
- **Duplicate link**: UNIQUE constraint prevents same supplier+product pair
