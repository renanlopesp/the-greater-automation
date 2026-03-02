# Implementation Plan: Gestao de Fornecedores

**Branch**: `029-supplier-management` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-supplier-management/spec.md`

## Summary

Sistema completo de gestao de fornecedores para e-commerce: 2 tabelas novas (store_suppliers, store_product_suppliers) com RLS, pagina /suppliers com lista + timeline de reposicao + alertas de urgencia + comparacao, API routes para CRUD, 4 retail tools para chat, e integracao com forecast de demanda existente.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, shadcn/ui (new-york), Tailwind CSS v4, Vercel AI SDK (jsonSchema), TanStack React Query, Zod
**Storage**: Supabase PostgreSQL (production: `djohaxwfketlsjurwqne`)
**Testing**: Vitest + @testing-library/react (unit), Playwright (E2E)
**Target Platform**: Web (Vercel)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Timeline de reposicao carrega em < 3s, CRUD em < 1s
**Constraints**: RLS em todas as tabelas, team-scoped access, dark mode support
**Scale/Scope**: ~50-200 fornecedores por loja, ~500-2000 vinculos produto-fornecedor

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                                                   |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | Pagina /suppliers como Server Component, client components so para interatividade                                       |
| II. shadcn/ui Component System | PASS   | Todos os componentes UI usam shadcn primitives (Table, Dialog, Badge, Card, Button)                                     |
| III. Tailwind CSS v4 + OKLCH   | PASS   | Estilizacao via Tailwind, cores via CSS variables                                                                       |
| IV. TypeScript Strict Mode     | PASS   | Tipos strict, Zod para validacao de inputs                                                                              |
| V. Simplicity and YAGNI        | PASS   | 2 tabelas simples, sem over-engineering. Timeline e calculo direto (estoque/media_diaria - lead_time)                   |
| VI. Supabase as Backend        | PASS   | Supabase como unico backend. RLS em todas as tabelas. API routes apenas para operacoes que Supabase nao faz diretamente |

Quality Gates:

- `bun run build` MUST pass with zero errors
- `bun run lint` MUST pass
- Keyboard navigation em todos os elementos interativos

## Project Structure

### Documentation (this feature)

```text
specs/029-supplier-management/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API contracts
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   └── suppliers/
│   │       └── page.tsx              # Server Component: auth, fetch, delegate
│   └── api/
│       └── store/
│           └── suppliers/
│               ├── route.ts          # GET (list) + POST (create)
│               ├── [id]/
│               │   └── route.ts      # PATCH (update) + DELETE (deactivate)
│               └── products/
│                   └── route.ts      # POST (link) + DELETE (unlink) + PATCH (update link)
├── components/
│   └── suppliers/
│       ├── suppliers-client.tsx      # Main client component (tabs: lista + timeline)
│       ├── supplier-list.tsx         # Table with search, filter, sort
│       ├── supplier-dialog.tsx       # Create/edit dialog (react-hook-form + zod)
│       ├── product-link-dialog.tsx   # Link product to supplier dialog
│       ├── reorder-timeline.tsx      # Timeline de reposicao com urgencia
│       ├── reorder-card.tsx          # Card individual de produto na timeline
│       ├── supplier-compare.tsx      # Comparacao lado a lado
│       └── purchase-history.tsx      # Historico de compras
├── lib/
│   ├── ai/
│   │   └── retail-tools.ts          # +4 tools (STORE_MANAGE_SUPPLIERS, etc.)
│   └── queries/
│       └── suppliers.ts             # React Query hooks (useSuppliers, useReorderTimeline, etc.)

supabase/
└── migrations/
    ├── 2026MMDD000001_create_store_suppliers.sql
    └── 2026MMDD000002_create_store_product_suppliers.sql
```

**Structure Decision**: Follows existing Relay patterns — page in (dashboard) group, API routes under /api/store/, components in dedicated folder, React Query hooks in lib/queries/.
