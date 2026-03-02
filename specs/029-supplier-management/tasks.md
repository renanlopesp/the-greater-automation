# Tasks: Gestao de Fornecedores

**Input**: Design documents from `/specs/029-supplier-management/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md

**Organization**: Tasks grouped by user story (6 stories: 3×P1, 2×P2, 1×P3). No test tasks — tests not requested in spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Database & Shared Infrastructure)

**Purpose**: Database tables, TypeScript types, React Query hooks, and navigation — everything shared across all stories.

- [x] T001 Create migration for store_suppliers table in supabase/migrations/20260302000001_create_store_suppliers.sql
- [x] T002 Create migration for store_product_suppliers table in supabase/migrations/20260302000002_create_store_product_suppliers.sql
- [x] T003 Apply migrations to production Supabase (supabase db push)
- [x] T004 Regenerate Supabase TypeScript types (supabase gen types)
- [x] T005 [P] Create React Query hooks file in src/lib/queries/suppliers.ts (useSuppliers, useCreateSupplier, useUpdateSupplier, useDeactivateSupplier, useProductSupplierLinks, useCreateLink, useUpdateLink, useDeleteLink, useReorderTimeline)
- [x] T006 [P] Add "Fornecedores" nav item to sidebar in src/components/app-sidebar.tsx (under Loja section, after Produtos, guarded by hasStore, icon: Truck)

**Checkpoint**: Tables exist, types generated, hooks scaffolded, nav visible.

---

## Phase 2: User Story 1 — Cadastro e Gestao de Fornecedores (Priority: P1) MVP

**Goal**: CRUD completo de fornecedores via pagina /suppliers — criar, listar, editar, desativar.

**Independent Test**: Criar fornecedor pela UI, verificar na lista, editar dados, desativar.

### API Layer

- [x] T007 [P] [US1] Create GET + POST route in src/app/api/store/suppliers/route.ts (list with search/filter/sort, create with Zod validation)
- [x] T008 [P] [US1] Create PATCH + DELETE route in src/app/api/store/suppliers/[id]/route.ts (update fields, soft-delete via is_active=false)

### UI Layer

- [x] T009 [US1] Create server page in src/app/(dashboard)/suppliers/page.tsx (auth, team check, fetch suppliers + reorder summary, delegate to client)
- [x] T010 [US1] Create main client component in src/components/suppliers/suppliers-client.tsx (2 tabs: "Fornecedores" + "Reposicao", tab state, urgency badge on Reposicao tab)
- [x] T011 [US1] Create supplier list component in src/components/suppliers/supplier-list.tsx (shadcn Table, search input, status filter, sort by name/lead_time, empty state)
- [x] T012 [US1] Create supplier dialog in src/components/suppliers/supplier-dialog.tsx (react-hook-form + Zod, create/edit mode, fields: name, email, phone, lead_time_days, min_order_value, payment_terms, notes)

### Chat Tool

- [x] T013 [US1] Add STORE_MANAGE_SUPPLIERS tool in src/lib/ai/retail-tools.ts (actions: list, create, update, deactivate — uses Supabase service client, Portuguese output)

**Checkpoint**: Supplier CRUD works end-to-end via UI and chat. List shows suppliers with search/filter/sort.

---

## Phase 3: User Story 2 — Vinculo Produto-Fornecedor (Priority: P1)

**Goal**: Vincular produtos a fornecedores N:N com custo especifico e flag preferencial.

**Independent Test**: Vincular produto a 2 fornecedores com precos diferentes, marcar preferencial, verificar exibicao.

**Depends on**: US1 (suppliers must exist)

### API Layer

- [x] T014 [US2] Create POST + PATCH + DELETE route in src/app/api/store/suppliers/products/route.ts (link/update/unlink with Zod, upsert on duplicate, preferred toggle unsets others)

### UI Layer

- [x] T015 [US2] Create product link dialog in src/components/suppliers/product-link-dialog.tsx (search products combobox, cost_price input, is_preferred toggle, shows existing links for supplier)
- [x] T016 [US2] Add product links section to supplier-list.tsx — expandable row or inline showing linked products count + "Vincular Produto" button per supplier
- [x] T017 [US2] Show linked suppliers on product context — display supplier badges/chips on supplier-list when viewing a supplier's linked products (cost_price vs store_products.cost_price transparency)

### Chat Tool

- [x] T018 [US2] Add STORE_LINK_PRODUCT_SUPPLIER tool in src/lib/ai/retail-tools.ts (actions: link, unlink, update, list — resolves product_name/supplier_name to IDs via ILIKE search, Portuguese output)

**Checkpoint**: Products linked to suppliers with cost/preferred. Links visible on supplier detail. Chat can link/unlink.

---

## Phase 4: User Story 3 — Calendario de Reposicao (Priority: P1)

**Goal**: Timeline de reposicao mostrando produtos ordenados por urgencia, cruzando estoque × vendas × lead time.

**Independent Test**: Produto com estoque para 8 dias e lead time 5 dias aparece como "urgente". Produto com 30 dias de estoque aparece como "saudavel".

**Depends on**: US1 + US2 (suppliers and links must exist)

### API Layer

- [x] T019 [US3] Create GET route in src/app/api/store/suppliers/reorder/route.ts (fetch products + links + orders, calculate avg_daily_sales from store_orders, compute urgency/days_of_stock/reorder_point/suggested_qty, return sorted by urgency)

### UI Layer

- [x] T020 [US3] Create reorder timeline component in src/components/suppliers/reorder-timeline.tsx (urgency filter chips, summary cards for critical/warning/healthy counts, list of reorder cards, "sem fornecedor" section)
- [x] T021 [US3] Create reorder card component in src/components/suppliers/reorder-card.tsx (product name + stock, supplier name + lead time, metrics: days_of_stock/suggested_qty/suggested_value, urgency badge with color coding, order_by_date)
- [x] T022 [US3] Wire reorder timeline into suppliers-client.tsx "Reposicao" tab (fetch via useReorderTimeline hook, loading skeleton, empty state)

### Chat Tool

- [x] T023 [US3] Add STORE_SUGGEST_REORDER tool in src/lib/ai/retail-tools.ts (uses Nuvemshop API for fresh order data, calculates reorder metrics, returns prioritized list with R$ formatting, urgency labels in Portuguese)

**Checkpoint**: Reorder timeline loads with real data. Products sorted by urgency. Chat returns prioritized reorder suggestions.

---

## Phase 5: User Story 4 — Alertas Visuais de Urgencia (Priority: P2)

**Goal**: Badges e indicadores visuais mostrando quantos produtos estao em situacao critica.

**Independent Test**: Com 3 produtos criticos, badge mostra "3 urgentes" na tab Reposicao e na sidebar.

**Depends on**: US3 (reorder calculations must exist)

- [x] T024 [US4] Add urgency badge to "Reposicao" tab label in src/components/suppliers/suppliers-client.tsx (red badge with critical count, from reorder summary data)
- [x] T025 [US4] Add urgency summary banner at top of reorder-timeline.tsx (colored cards: critical=red, warning=amber, healthy=green, with counts and "sem fornecedor" if any)
- [x] T026 [US4] Enhance reorder-card.tsx with visual urgency styling (critical: red border/badge, warning: amber, healthy: green, animate transition on data refresh)
- [x] T027 [US4] Add positive empty state when no critical items in reorder-timeline.tsx (success message "Todos os produtos estao com estoque saudavel")

**Checkpoint**: Visual urgency indicators work. Tab badge shows critical count. Cards styled by urgency level.

---

## Phase 6: User Story 5 — Comparacao de Fornecedores (Priority: P2)

**Goal**: Comparar fornecedores para um mesmo produto lado a lado (preco, lead time, pedido minimo, ultima compra).

**Independent Test**: Produto com 3 fornecedores vinculados exibe tabela comparativa completa.

**Depends on**: US2 (product-supplier links must exist)

### UI Layer

- [x] T028 [US5] Create supplier compare dialog in src/components/suppliers/supplier-compare.tsx (shadcn Dialog, table comparing all suppliers for a product: name, cost_price, lead_time_days, min_order_value, last_order_at, highlight preferred, highlight best price/fastest)
- [x] T029 [US5] Add "Comparar" button to reorder-card.tsx (visible when has_other_suppliers=true, opens supplier-compare dialog for that product)
- [x] T030 [US5] Handle single-supplier case in supplier-compare.tsx (show info message "Apenas 1 fornecedor vinculado" with suggestion to add more)

### Chat Tool

- [x] T031 [US5] Add STORE_COMPARE_SUPPLIERS tool in src/lib/ai/retail-tools.ts (takes product_name, resolves to product_id, fetches all linked suppliers, returns comparison table with Portuguese labels, highlights best option)

**Checkpoint**: Compare dialog shows side-by-side data. Accessible from timeline cards. Chat returns formatted comparison.

---

## Phase 7: User Story 6 — Registro de Historico de Compras (Priority: P3)

**Goal**: Registrar compras feitas (data, quantidade, valor) que atualizam last_order_at e last_order_qty no vinculo.

**Independent Test**: Registrar compra e verificar que last_order_at/last_order_qty sao atualizados.

**Depends on**: US2 (product-supplier links must exist)

- [x] T032 [US6] Create purchase history dialog in src/components/suppliers/purchase-history.tsx (form: date, quantity, total_value, linked to a specific product-supplier link, updates last_order_at/last_order_qty on submit via PATCH to /api/store/suppliers/products)
- [x] T033 [US6] Add "Registrar Compra" action to reorder-card.tsx and supplier-compare.tsx (button opens purchase-history dialog pre-filled with suggested_qty and supplier info)
- [x] T034 [US6] Show last purchase info in supplier-list.tsx expanded view (last_order_at formatted, last_order_qty, "Nenhuma compra registrada" if null)

**Checkpoint**: Purchase registration works. last_order fields updated. History visible in supplier detail and compare views.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality, performance, and UX improvements across all stories.

- [x] T035 Add loading skeletons for supplier list and reorder timeline in respective components
- [x] T036 Add keyboard navigation support to supplier-dialog.tsx and product-link-dialog.tsx (tab order, Enter to submit, Escape to close)
- [x] T037 Verify dark mode styling across all supplier components (test with light/dark toggle)
- [x] T038 Run `bun run build` and fix any TypeScript errors
- [x] T039 Run `bun run lint` and fix any linting issues
- [x] T040 Validate full flow per quickstart.md (create supplier → link product → check timeline → compare → register purchase)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 (tables + types + hooks)
- **Phase 3 (US2)**: Depends on Phase 2 (suppliers must exist to link products)
- **Phase 4 (US3)**: Depends on Phase 2 + Phase 3 (needs suppliers + links for reorder calc)
- **Phase 5 (US4)**: Depends on Phase 4 (urgency data from reorder timeline)
- **Phase 6 (US5)**: Depends on Phase 3 (needs product-supplier links) — can run parallel with Phase 4/5
- **Phase 7 (US6)**: Depends on Phase 3 (needs product-supplier links) — can run parallel with Phase 4/5/6
- **Phase 8 (Polish)**: Depends on all previous phases

### User Story Dependencies

```
Phase 1 (Setup)
    └── Phase 2 (US1: Supplier CRUD)     ← MVP
        ├── Phase 3 (US2: Product Links)
        │   ├── Phase 4 (US3: Reorder Timeline)
        │   │   └── Phase 5 (US4: Urgency Alerts)
        │   ├── Phase 6 (US5: Compare)     ← parallel with US3/US4
        │   └── Phase 7 (US6: Purchase)    ← parallel with US3/US4/US5
        └── Phase 8 (Polish)
```

### Parallel Opportunities

**Within Phase 1**: T005 and T006 can run in parallel (different files)
**Within Phase 2**: T007 and T008 can run in parallel (API routes are independent files)
**After Phase 3**: US5 (Compare) and US6 (Purchase) can run in parallel with US3 (Reorder) since they only depend on US2 (Links)
**Within each US**: API layer can be built before UI layer

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migrations, types, hooks, nav)
2. Complete Phase 2: US1 — Supplier CRUD
3. **STOP and VALIDATE**: Create/edit/deactivate suppliers works via UI + chat
4. Deploy if ready — suppliers page is functional

### Incremental Delivery

1. Setup + US1 → Suppliers page live (MVP!)
2. - US2 → Products linked to suppliers with costs
3. - US3 → Reorder timeline showing what to buy and when (killer feature)
4. - US4 → Visual urgency alerts (polish on US3)
5. - US5 → Supplier comparison for purchase decisions
6. - US6 → Purchase history tracking

### Estimated Task Count Per Story

| Story                 | Tasks  | Priority |
| --------------------- | ------ | -------- |
| Setup                 | 6      | —        |
| US1: Supplier CRUD    | 7      | P1       |
| US2: Product Links    | 5      | P1       |
| US3: Reorder Timeline | 5      | P1       |
| US4: Urgency Alerts   | 4      | P2       |
| US5: Compare          | 4      | P2       |
| US6: Purchase History | 3      | P3       |
| Polish                | 6      | —        |
| **Total**             | **40** |          |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after its phase completes
- Chat tools (T013, T018, T023, T031) all go into the same file (retail-tools.ts) — execute sequentially
- Migrations (T001, T002) must be applied (T003) before types can be generated (T004)
- Commit after each phase completion for clean git history
