# Quickstart: Retail Intelligence

## What This Feature Adds

Two new STORE\_\* tools to the existing retail agent toolkit:

- **STORE_ANALYZE_CUSTOMERS**: RFM segmentation + repurchase prediction
- **STORE_ANALYZE_PRODUCTS**: ABC/Pareto classification + dead stock identification

## Files Modified

| File                         | Change                                  |
| ---------------------------- | --------------------------------------- |
| `src/lib/ai/retail-tools.ts` | Add 2 new tools to `buildRetailTools()` |

No new files, no new DB tables, no new API routes, no new dependencies.

## How to Test

### Via Telegram Bot

1. Connect a store with Nuvemshop (must have order history)
2. Ask: "analise meus clientes" → triggers STORE_ANALYZE_CUSTOMERS
3. Ask: "quais produtos sao mais importantes?" → triggers STORE_ANALYZE_PRODUCTS
4. Ask: "tem alguem pra mandar cupom?" → triggers STORE_ANALYZE_CUSTOMERS with focus=repurchase

### Via Agent Chat (web UI)

Same queries work in the agent chat interface where retail tools are available.

## Verification

```bash
# Build must pass
bun run build

# Lint must pass
bun run lint
```

Manual verification:

- [ ] STORE_ANALYZE_CUSTOMERS returns segmented results for a store with 10+ orders
- [ ] STORE_ANALYZE_CUSTOMERS with focus=repurchase shows overdue customers
- [ ] STORE_ANALYZE_PRODUCTS returns A/B/C classification
- [ ] STORE_ANALYZE_PRODUCTS identifies dead stock
- [ ] Both tools handle stores with no orders gracefully
- [ ] Both tools respect the `days` and `limit` parameters
- [ ] Margin analysis works when cost_price exists in store_products
- [ ] Margin analysis is skipped gracefully when cost_price is null
