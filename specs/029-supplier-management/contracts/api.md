# API Contracts: Gestao de Fornecedores

**Feature**: 029-supplier-management | **Date**: 2026-03-02

## Authentication

All endpoints require authenticated user with active team membership. Store is resolved from team's store. Returns 401 if unauthenticated, 404 if no store found.

---

## 1. Suppliers CRUD

### GET /api/store/suppliers

List all suppliers for the team's store.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | | Filter by name (case-insensitive ILIKE) |
| status | "active" \| "inactive" \| "all" | "active" | Filter by is_active |
| sort | "name" \| "lead_time" \| "created" | "name" | Sort field |
| order | "asc" \| "desc" | "asc" | Sort direction |

**Response 200**:

```json
{
  "suppliers": [
    {
      "id": "uuid",
      "name": "Distribuidora ABC",
      "contact_email": "contato@abc.com",
      "contact_phone": "11999998888",
      "lead_time_days": 5,
      "min_order_value": 500.0,
      "payment_terms": "30 dias",
      "notes": null,
      "is_active": true,
      "product_count": 12,
      "created_at": "2026-03-02T10:00:00Z",
      "updated_at": "2026-03-02T10:00:00Z"
    }
  ]
}
```

### POST /api/store/suppliers

Create a new supplier.

**Request Body**:

```json
{
  "name": "Distribuidora ABC",
  "contact_email": "contato@abc.com",
  "contact_phone": "11999998888",
  "lead_time_days": 5,
  "min_order_value": 500.0,
  "payment_terms": "30 dias",
  "notes": "Entrega somente terça e quinta"
}
```

**Validation** (Zod):

- `name`: string, min 2, max 200, required
- `contact_email`: string, email format, optional
- `contact_phone`: string, optional
- `lead_time_days`: integer, min 1, max 365, required
- `min_order_value`: number, min 0, optional
- `payment_terms`: string, max 500, optional
- `notes`: string, max 2000, optional

**Response 201**: Created supplier object
**Response 400**: Validation error
**Response 409**: Supplier with same name already exists

---

### PATCH /api/store/suppliers/[id]

Update an existing supplier.

**Request Body**: Partial supplier fields (same validation as POST, all optional)

**Response 200**: Updated supplier object
**Response 404**: Supplier not found

### DELETE /api/store/suppliers/[id]

Soft-delete (deactivate) a supplier.

**Response 200**: `{ "success": true }`
**Response 404**: Supplier not found

---

## 2. Product-Supplier Links

### POST /api/store/suppliers/products

Link a product to a supplier.

**Request Body**:

```json
{
  "supplier_id": "uuid",
  "product_id": "uuid",
  "cost_price": 45.0,
  "is_preferred": false
}
```

**Validation** (Zod):

- `supplier_id`: string, uuid, required
- `product_id`: string, uuid, required
- `cost_price`: number, min 0, optional
- `is_preferred`: boolean, optional (default false)

**Response 201**: Created link object
**Response 400**: Validation error
**Response 409**: Link already exists (upserts instead — updates cost_price/is_preferred)

### PATCH /api/store/suppliers/products

Update an existing product-supplier link.

**Request Body**:

```json
{
  "id": "uuid",
  "cost_price": 42.0,
  "is_preferred": true
}
```

**Side effect**: If `is_preferred: true`, unsets `is_preferred` on all other links for the same product.

**Response 200**: Updated link object
**Response 404**: Link not found

### DELETE /api/store/suppliers/products

Unlink a product from a supplier.

**Request Body**:

```json
{
  "id": "uuid"
}
```

**Response 200**: `{ "success": true }`
**Response 404**: Link not found

---

## 3. Reorder Timeline

### GET /api/store/suppliers/reorder

Get reorder suggestions for all products with supplier links.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| urgency | "critical" \| "warning" \| "healthy" \| "all" | "all" | Filter by urgency level |
| supplier_id | uuid | | Filter by specific supplier |
| days | integer | 30 | Sales history window for avg_daily calculation |

**Response 200**:

```json
{
  "summary": {
    "total_products": 45,
    "critical": 3,
    "warning": 8,
    "healthy": 30,
    "no_supplier": 4
  },
  "items": [
    {
      "product": {
        "id": "uuid",
        "name": "Racao Premium 15kg",
        "stock_quantity": 12,
        "price": 189.9
      },
      "supplier": {
        "id": "uuid",
        "name": "Distribuidora ABC",
        "lead_time_days": 5,
        "min_order_value": 500.0
      },
      "metrics": {
        "avg_daily_sales": 2.5,
        "days_of_stock": 4.8,
        "reorder_point": 15,
        "suggested_qty": 75,
        "suggested_value": 3375.0
      },
      "urgency": "critical",
      "order_by_date": "2026-03-02",
      "has_other_suppliers": true
    }
  ],
  "no_supplier": [
    {
      "product_id": "uuid",
      "product_name": "Coleira Ajustavel",
      "stock_quantity": 3,
      "avg_daily_sales": 1.2,
      "days_of_stock": 2.5
    }
  ]
}
```

**Sort**: Items sorted by urgency (critical first), then by days_of_stock ascending.

---

## 4. Chat Tools (retail-tools.ts)

### STORE_MANAGE_SUPPLIERS

**Input**: `{ action: "list" | "create" | "update" | "deactivate", ...fields }`
**Output**: Supplier object or list. Portuguese field names.

### STORE_LINK_PRODUCT_SUPPLIER

**Input**: `{ action: "link" | "unlink" | "update" | "list", supplier_name?, product_name?, cost_price?, is_preferred? }`
**Output**: Link object or list. Resolves names to IDs internally.

### STORE_SUGGEST_REORDER

**Input**: `{ days?: 30-90, urgency?: "all" | "critical" | "warning", supplier_name? }`
**Output**: Prioritized list with Portuguese labels, R$ formatting, urgency badges.

### STORE_COMPARE_SUPPLIERS

**Input**: `{ product_name: string }`
**Output**: Side-by-side comparison table with price, lead time, min order, last purchase.
