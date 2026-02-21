# API Routes: 027-retail-pivot

## Onboarding

### POST /api/onboarding

Create store and provision agents.

**Request:**

```json
{
  "store_name": "Minha Loja",
  "segment": "roupas",
  "platform": "nuvemshop",
  "platform_url": "https://minhaloja.nuvemshop.com.br",
  "priorities": ["controle_de_estoque", "resumo_de_vendas"]
}
```

**Response 201:**

```json
{
  "store_id": "uuid",
  "agents_created": 4,
  "workflows_created": 2,
  "next_step": "telegram_link"
}
```

**Response 409:** Store already exists for this team.

### GET /api/onboarding/status

Check if current user needs onboarding.

**Response 200:**

```json
{
  "has_store": true,
  "onboarding_completed": true,
  "store": { "id": "uuid", "name": "Minha Loja", "platform": "nuvemshop" }
}
```

## Nuvemshop Integration

### GET /api/nuvemshop/connect

Initiate OAuth flow. Redirects to Nuvemshop authorization URL.

**Query params:** `redirect_uri` (where to return after OAuth)

**Response:** 302 redirect to `https://www.tiendanube.com/apps/{app_id}/authorize?state={csrf}`

### GET /api/nuvemshop/callback

OAuth callback. Exchanges code for token, stores credentials, triggers initial sync.

**Query params:** `code`, `state`

**Response:** 302 redirect to `redirect_uri` (from state)

### POST /api/nuvemshop/sync

Trigger manual product sync.

**Response 200:**

```json
{
  "status": "syncing",
  "products_count": 0,
  "message": "Sync started"
}
```

### POST /api/nuvemshop/webhook

Receive Nuvemshop webhook events (product/updated, order/created, etc.).

**Headers:** `x-linkedstore-hmac-sha256` for verification.

**Request body:**

```json
{
  "store_id": 12345,
  "event": "product/updated",
  "id": 67890
}
```

**Response 200:** `{ "ok": true }`

## Store Data (used by Telegram AI tools)

### GET /api/store/products

List synced products with stock info.

**Query params:** `search`, `low_stock` (boolean), `page`, `per_page`

**Response 200:**

```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Camiseta Preta",
      "sku": "CAM-001",
      "price": 49.9,
      "stock_quantity": 3,
      "variants": [
        { "id": "v1", "name": "P", "stock": 1 },
        { "id": "v2", "name": "M", "stock": 2 }
      ]
    }
  ],
  "total": 150,
  "page": 1
}
```

### GET /api/store/sales-summary

Get sales data for a date range.

**Query params:** `date` (ISO), `compare` (boolean — include previous period)

**Response 200:**

```json
{
  "date": "2026-02-21",
  "orders_count": 12,
  "revenue": 1847.5,
  "currency": "BRL",
  "top_products": [{ "name": "Camiseta Preta", "quantity": 5, "revenue": 249.5 }],
  "comparison": {
    "orders_count": 8,
    "revenue": 1200.0,
    "change_percent": 53.9
  }
}
```

### PUT /api/store/stock-alerts

Update stock alert thresholds.

**Request:**

```json
{
  "default_threshold": 10,
  "product_overrides": [{ "product_id": "uuid", "threshold": 3 }]
}
```

**Response 200:**

```json
{ "updated": true }
```

## Telegram AI Tools (internal, not HTTP)

These are added to `buildPlatformTools()` for the Telegram bot:

| Tool                  | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| STORE_QUERY_STOCK     | Query product stock levels (search by name, SKU, or "all low stock") |
| STORE_QUERY_SALES     | Get sales summary for today/yesterday/this week/custom date          |
| STORE_UPDATE_ALERT    | Update stock alert thresholds (global or per-product)                |
| STORE_TRIGGER_SYNC    | Trigger a manual product sync                                        |
| STORE_LIST_ORDERS     | List recent orders with status filters                               |
| STORE_UPDATE_SCHEDULE | Update scheduled workflow times (daily summary)                      |

## Pages (App Router)

| Route                  | Type   | Description                                        |
| ---------------------- | ------ | -------------------------------------------------- |
| `/onboarding`          | Client | Multi-step onboarding form                         |
| `/onboarding/telegram` | Client | Telegram linking step                              |
| `/home`                | Server | Retail home (replaces /dashboard for retail users) |
| `/home`                | Server | Quick stats + recent alerts + store status         |
