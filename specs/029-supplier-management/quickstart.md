# Quickstart: Gestao de Fornecedores

**Feature**: 029-supplier-management | **Date**: 2026-03-02

## Prerequisites

- Relay dev environment running (`bun dev`)
- Supabase project accessible (production: `djohaxwfketlsjurwqne`)
- A store connected with products synced (Nuvemshop integration)
- Store orders synced (for reorder calculations)

## Setup Steps

### 1. Run Database Migrations

```bash
# Two migrations: store_suppliers + store_product_suppliers
supabase db push
```

### 2. Verify Tables

```sql
SELECT * FROM store_suppliers LIMIT 1;
SELECT * FROM store_product_suppliers LIMIT 1;
```

### 3. Add Navigation

The /suppliers page is added to the sidebar under "Loja" section, after "Produtos". Only visible when `hasStore` is true.

### 4. Test CRUD

1. Navigate to `/suppliers`
2. Click "Novo Fornecedor"
3. Fill: name, lead time, optional fields
4. Save → supplier appears in list
5. Click to edit → update fields → save
6. Deactivate → supplier hidden from active list

### 5. Test Product Links

1. Open a supplier detail or use the link dialog
2. Search for a product → select → set cost price
3. Mark as preferred if desired
4. Verify link appears on both supplier and product views

### 6. Test Reorder Timeline

1. Switch to "Reposicao" tab on /suppliers
2. Products with suppliers and stock data should appear
3. Items ordered by urgency (critical → warning → healthy)
4. Products without suppliers shown separately with "Vincular" prompt

### 7. Test Chat Tools

```
"cadastra o fornecedor Distribuidora ABC, lead time 5 dias, pedido minimo R$ 500"
"vincula a Racao Premium ao fornecedor ABC por R$ 45"
"o que preciso comprar essa semana?"
"compara os fornecedores da Racao Premium"
```

## Key Files

| File                                                              | Purpose                      |
| ----------------------------------------------------------------- | ---------------------------- |
| `src/app/(dashboard)/suppliers/page.tsx`                          | Server Component entry point |
| `src/components/suppliers/suppliers-client.tsx`                   | Main client component (tabs) |
| `src/components/suppliers/supplier-list.tsx`                      | Supplier table with CRUD     |
| `src/components/suppliers/reorder-timeline.tsx`                   | Reorder suggestions view     |
| `src/app/api/store/suppliers/route.ts`                            | GET + POST API               |
| `src/app/api/store/suppliers/[id]/route.ts`                       | PATCH + DELETE API           |
| `src/app/api/store/suppliers/products/route.ts`                   | Link management API          |
| `src/lib/ai/retail-tools.ts`                                      | 4 new chat tools             |
| `src/lib/queries/suppliers.ts`                                    | React Query hooks            |
| `supabase/migrations/2026MMDD_create_store_suppliers.sql`         | Supplier table               |
| `supabase/migrations/2026MMDD_create_store_product_suppliers.sql` | Link table                   |

## Architecture Notes

- **Page pattern**: Server Component (auth + fetch) → delegates to client component
- **RLS chain**: store_suppliers → stores → team_members (same as store_products)
- **Reorder calculation**: Uses store_orders (Supabase) for UI speed; chat tools use Nuvemshop API for freshness
- **Preferred supplier**: Application-level enforcement (unset others on set)
- **Soft delete**: Suppliers are deactivated, never hard-deleted. Links remain for history.
