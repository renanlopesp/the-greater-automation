# Data Model: Chat Dynamic Artifacts

## No Schema Changes

Uses existing `tasks` table columns:

- `artifact_data` (JSONB) — stores the chat-data artifact payload
- `artifact_type` (text) — set to `'chat-data'`
- `skill_status` (text) — set to `'completed'` when artifact is written

## Artifact Data Payload Shapes

### Sales Summary

```json
{
  "type": "sales_summary",
  "title": "Vendas de Hoje",
  "data": {
    "total_revenue": 910.66,
    "order_count": 2,
    "paid_count": 2,
    "period": "hoje",
    "top_products": [
      { "name": "Manta Maternidade", "quantity": 1, "revenue": 249 },
      { "name": "Body Comfy Tricot", "quantity": 1, "revenue": 249 }
    ]
  }
}
```

### Product Table

```json
{
  "type": "product_table",
  "title": "Produtos com Estoque Baixo",
  "data": {
    "products": [
      { "name": "Body Vanilla", "stock": 2, "price": 249, "status": "warning" },
      { "name": "Kit Touca Pink", "stock": 3, "price": 139, "status": "warning" }
    ],
    "total_count": 2
  }
}
```

### Order List

```json
{
  "type": "order_list",
  "title": "Pedidos de Hoje",
  "data": {
    "orders": [
      {
        "number": "#12847",
        "customer": "Maria Silva",
        "total": 498,
        "status": "paid",
        "date": "10:42"
      },
      {
        "number": "#12846",
        "customer": "João Santos",
        "total": 412,
        "status": "paid",
        "date": "09:15"
      }
    ],
    "total_revenue": 910.66,
    "total_count": 2
  }
}
```

### Metric Card

```json
{
  "type": "metric_card",
  "title": "Ticket Médio",
  "data": {
    "value": "R$ 455,33",
    "label": "ticket médio",
    "subtitle": "Baseado em 2 pedidos nos últimos 7 dias"
  }
}
```
