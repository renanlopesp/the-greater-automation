# Data Model: 027-retail-pivot

## New Tables

### `stores`

The central retail entity. One store per team.

| Column                | Type        | Constraints                    | Description                                                                       |
| --------------------- | ----------- | ------------------------------ | --------------------------------------------------------------------------------- |
| id                    | uuid        | PK, default gen_random_uuid()  | Store ID                                                                          |
| team_id               | uuid        | FK teams(id), UNIQUE, NOT NULL | Owning team                                                                       |
| name                  | text        | NOT NULL                       | Store display name                                                                |
| segment               | text        | NOT NULL                       | roupas, eletronicos, alimentos, cosmeticos, casa-decoracao, esportes, pet, outros |
| platform              | text        | NOT NULL                       | nuvemshop, shopify, mercadolivre, manual                                          |
| platform_url          | text        | NULL                           | Store URL on the platform                                                         |
| platform_store_id     | text        | NULL                           | External store ID (e.g., Nuvemshop user_id)                                       |
| platform_access_token | text        | NULL                           | OAuth access token (encrypted at rest via Supabase vault)                         |
| priorities            | text[]      | NOT NULL, default '{}'         | Selected onboarding priorities                                                    |
| onboarding_completed  | boolean     | NOT NULL, default false        | Whether onboarding is done                                                        |
| last_sync_at          | timestamptz | NULL                           | Last successful product sync                                                      |
| created_at            | timestamptz | NOT NULL, default now()        |                                                                                   |
| updated_at            | timestamptz | NOT NULL, default now()        |                                                                                   |

**Indexes**: `idx_stores_team_id` on (team_id)
**RLS**: team_members can read/write their own team's store.

### `store_products`

Synced product catalog from the connected platform.

| Column              | Type          | Constraints                               | Description                                    |
| ------------------- | ------------- | ----------------------------------------- | ---------------------------------------------- |
| id                  | uuid          | PK, default gen_random_uuid()             | Internal product ID                            |
| store_id            | uuid          | FK stores(id) ON DELETE CASCADE, NOT NULL | Parent store                                   |
| external_id         | text          | NOT NULL                                  | Platform product ID                            |
| name                | text          | NOT NULL                                  | Product name (pt-BR)                           |
| sku                 | text          | NULL                                      | Primary SKU                                    |
| price               | numeric(10,2) | NULL                                      | Current price                                  |
| stock_quantity      | integer       | NOT NULL, default 0                       | Total stock across variants                    |
| variants            | jsonb         | NOT NULL, default '[]'                    | Array of {id, sku, name, price, stock, values} |
| images              | text[]        | NOT NULL, default '{}'                    | Image URLs                                     |
| is_published        | boolean       | NOT NULL, default true                    | Whether visible on store                       |
| external_updated_at | timestamptz   | NULL                                      | Last update on platform                        |
| last_synced_at      | timestamptz   | NOT NULL, default now()                   | Last sync timestamp                            |
| created_at          | timestamptz   | NOT NULL, default now()                   |                                                |

**Indexes**:

- `idx_store_products_store_id` on (store_id)
- `idx_store_products_external_id` on (store_id, external_id) UNIQUE
- `idx_store_products_low_stock` on (store_id, stock_quantity) WHERE stock_quantity > 0

**RLS**: Via store → team_members chain.

### `store_stock_alerts`

Per-product or global stock threshold configs.

| Column          | Type        | Constraints                                   | Description              |
| --------------- | ----------- | --------------------------------------------- | ------------------------ |
| id              | uuid        | PK, default gen_random_uuid()                 |                          |
| store_id        | uuid        | FK stores(id) ON DELETE CASCADE, NOT NULL     | Parent store             |
| product_id      | uuid        | FK store_products(id) ON DELETE CASCADE, NULL | NULL = global default    |
| threshold       | integer     | NOT NULL, default 5                           | Alert when stock <= this |
| is_enabled      | boolean     | NOT NULL, default true                        |                          |
| last_alerted_at | timestamptz | NULL                                          | Prevent duplicate alerts |
| created_at      | timestamptz | NOT NULL, default now()                       |                          |

**Indexes**: `idx_store_stock_alerts_store_product` on (store_id, product_id) UNIQUE
**RLS**: Via store → team_members chain.

### `store_orders`

Synced orders for sales reporting.

| Column         | Type          | Constraints                               | Description                                       |
| -------------- | ------------- | ----------------------------------------- | ------------------------------------------------- |
| id             | uuid          | PK, default gen_random_uuid()             |                                                   |
| store_id       | uuid          | FK stores(id) ON DELETE CASCADE, NOT NULL |                                                   |
| external_id    | text          | NOT NULL                                  | Platform order ID                                 |
| order_number   | text          | NULL                                      | Human-readable order number                       |
| status         | text          | NOT NULL                                  | open, closed, cancelled                           |
| payment_status | text          | NULL                                      | pending, paid, refunded, etc.                     |
| total          | numeric(10,2) | NOT NULL                                  | Order total                                       |
| currency       | text          | NOT NULL, default 'BRL'                   |                                                   |
| customer_name  | text          | NULL                                      |                                                   |
| customer_email | text          | NULL                                      |                                                   |
| items          | jsonb         | NOT NULL, default '[]'                    | Array of {product_id, name, quantity, price, sku} |
| ordered_at     | timestamptz   | NOT NULL                                  | When the order was placed                         |
| created_at     | timestamptz   | NOT NULL, default now()                   |                                                   |

**Indexes**:

- `idx_store_orders_store_id` on (store_id)
- `idx_store_orders_external_id` on (store_id, external_id) UNIQUE
- `idx_store_orders_date` on (store_id, ordered_at)

### `store_price_monitors`

Competitor price monitoring entries.

| Column          | Type          | Constraints                               | Description                        |
| --------------- | ------------- | ----------------------------------------- | ---------------------------------- |
| id              | uuid          | PK, default gen_random_uuid()             |                                    |
| store_id        | uuid          | FK stores(id) ON DELETE CASCADE, NOT NULL |                                    |
| product_name    | text          | NOT NULL                                  | What we're monitoring              |
| marketplace     | text          | NOT NULL                                  | mercadolivre, shopee, amazon, etc. |
| url             | text          | NULL                                      | Direct URL to competitor listing   |
| last_price      | numeric(10,2) | NULL                                      | Last observed price                |
| last_checked_at | timestamptz   | NULL                                      |                                    |
| is_active       | boolean       | NOT NULL, default true                    |                                    |
| created_at      | timestamptz   | NOT NULL, default now()                   |                                    |

**Indexes**: `idx_store_price_monitors_store_id` on (store_id)

### `nuvemshop_webhooks`

Tracks registered Nuvemshop webhooks per store.

| Column              | Type        | Constraints                               | Description                          |
| ------------------- | ----------- | ----------------------------------------- | ------------------------------------ |
| id                  | uuid        | PK, default gen_random_uuid()             |                                      |
| store_id            | uuid        | FK stores(id) ON DELETE CASCADE, NOT NULL |                                      |
| external_webhook_id | text        | NOT NULL                                  | Nuvemshop webhook ID                 |
| event               | text        | NOT NULL                                  | e.g., product/updated, order/created |
| created_at          | timestamptz | NOT NULL, default now()                   |                                      |

**Indexes**: `idx_nuvemshop_webhooks_store_id` on (store_id)

## Modified Tables

### `teams` (add column)

| Column    | Type                   | Description                             |
| --------- | ---------------------- | --------------------------------------- |
| has_store | boolean, default false | Quick check to skip onboarding redirect |

## Entity Relationships

```
teams (1) ── (1) stores
stores (1) ── (N) store_products
stores (1) ── (N) store_stock_alerts
stores (1) ── (N) store_orders
stores (1) ── (N) store_price_monitors
stores (1) ── (N) nuvemshop_webhooks
stores (1) ── (4) agents [auto-created, FK via team_id]
store_products (1) ── (0..1) store_stock_alerts [per-product override]
```

## State Transitions

### Store Onboarding

```
no_store → onboarding_started → store_created → platform_connected → onboarding_completed
```

### Product Sync

```
pending_sync → syncing → synced → stale (after 15 min) → syncing
```

### Stock Alert

```
monitoring → threshold_breached → alert_sent → cooldown (1 hour) → monitoring
```
