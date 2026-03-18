# Implementation Plan: Agent Modules System

**Branch**: `036-agent-modules-system` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-agent-modules-system/spec.md`

## Summary

Redesign the agent architecture from generic shells with text-only skills to module-based agents with executable capabilities. Modules are workflow-backed, connection-aware, and pre-configured on install. The first agent is "Carrinho & Conversao" with 4 modules. Includes full installed agent page redesign with activity feed, artifact panel, and module management. Old skill system is cleaned up.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Supabase (@supabase/ssr), Vercel AI SDK, TanStack React Query, Zustand, shadcn/ui (new-york), Tailwind CSS v4
**Storage**: Supabase PostgreSQL (production: `djohaxwfketlsjurwqne`)
**Testing**: Vitest + @testing-library/react + happy-dom
**Target Platform**: Web (Next.js App Router, Server + Client Components)
**Project Type**: Web application (single repo, App Router)
**Performance Goals**: Installed agent page loads in < 2s, activity feed updates within 30min of module run
**Constraints**: Supabase RLS on all tables, Server Components by default, no direct hex/rgb colors
**Scale/Scope**: 1 agent type (Carrinho & Conversao), 4 modules, ~15 new/modified components, 3-5 new DB tables, migration of existing abandoned cart cron

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                  |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | All pages under `src/app/(dashboard)/agents/[id]`, Server Components for data fetching |
| II. shadcn/ui Component System | PASS   | All UI built with shadcn primitives (Table, Card, Button, Badge, Tabs)                 |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind classes and CSS variable tokens                               |
| IV. TypeScript Strict Mode     | PASS   | All new code in strict TS, Zod for external data validation                            |
| V. Simplicity and YAGNI        | PASS   | Only Carrinho & Conversao agent, no premature abstractions for future agent types      |
| VI. Supabase as Backend        | PASS   | All new tables in Supabase with RLS, no custom CRUD API routes                         |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/036-agent-modules-system/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── modules-api.md
│   └── activity-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/agents/[id]/
│   ├── page.tsx                    # Installed agent page (Server Component)
│   └── installed/page.tsx          # Redirect or merge with [id]/page.tsx
├── components/
│   ├── agent-detail/
│   │   ├── installed-agent-page.tsx    # Client shell: 2-panel layout
│   │   ├── agent-activity-feed.tsx     # Activity snapshot + action log
│   │   ├── agent-activity-item.tsx     # Single action log row
│   │   ├── artifact-panel.tsx          # Right panel: resizable artifact viewer
│   │   ├── artifact-cart-table.tsx     # Artifact type: cart table
│   │   ├── artifact-channels.tsx       # Artifact type: channel performance bars
│   │   ├── artifact-conversions.tsx    # Artifact type: conversion list
│   │   ├── artifact-approval.tsx       # Artifact type: message approval with WA preview
│   │   ├── module-list.tsx             # Configure tab: module cards with toggle
│   │   ├── module-card.tsx             # Single module status + connections
│   │   ├── connection-tour.tsx         # First-install connection verification
│   │   └── agent-results-tab.tsx       # Results tab: aggregated KPIs
│   ├── discover/
│   │   └── install-wizard-modal.tsx    # Updated: triggers real agent creation
│   └── coworker-avatar.tsx             # Existing, reused
├── lib/
│   ├── modules/
│   │   ├── types.ts                    # Module, ModuleStatus, ModuleDefinition types
│   │   ├── registry.ts                 # Agent type → module definitions mapping
│   │   ├── provision.ts                # Create agent + modules + workflows on install
│   │   └── status.ts                   # Connection-aware module status resolution
│   ├── actions/
│   │   ├── agents.ts                   # Updated: createAgent now provisions modules
│   │   └── modules.ts                  # toggleModule, getModuleStatus
│   ├── queries/
│   │   └── agent-activity.ts           # Fetch activity feed, KPIs, action logs
│   └── retail/
│       └── abandoned-cart.ts           # Existing, migrated to module workflow
├── hooks/
│   ├── use-agent-activity.ts           # React Query hook for activity feed
│   └── use-agent-modules.ts            # React Query hook for module status
└── stores/
    └── agent-workspace-store.ts        # Zustand: selected artifact, active tab

supabase/migrations/
├── YYYYMMDD_create_agent_modules.sql
├── YYYYMMDD_create_module_workflows.sql
├── YYYYMMDD_create_workflow_run_outputs.sql
└── YYYYMMDD_cleanup_old_skills.sql
```

**Structure Decision**: Single Next.js app with App Router. New code follows existing patterns: Server Components for data fetching in `page.tsx`, Client Components for interactive UI, Supabase for all storage, existing workflow engine reused for module automations.

## Phase 0: Research

### R-001: Module-Workflow Relationship

**Decision**: Modules own workflows via a `module_id` foreign key on the existing `agent_workflows` table. No new workflow engine needed.

**Rationale**: The existing workflow engine already supports cron triggers, webhook triggers, app event triggers, and multiple step types (composio_action, ai_transform, notify, claude_agent). Adding `module_id` to `agent_workflows` links workflows to modules without duplicating infrastructure.

**Alternatives considered**:

- New `module_workflows` table separate from `agent_workflows` — rejected: duplicates schema and executor code
- Modules without workflows (just functions) — rejected: loses visibility, logging, retry logic

### R-002: Module Status Resolution

**Decision**: Module status is computed at read time from connection state + user toggle + last workflow run status. No background daemon.

**Rationale**: Status depends on: (1) are required connections present? (2) did user disable it? (3) did last run fail? Computing this at read time avoids stale state and background processes. The `agent_modules` table stores `enabled` (user toggle) and `required_connections` (JSON array). Status is derived.

**Alternatives considered**:

- Background worker that polls connection state — rejected: adds complexity, stale by design
- Webhook on connection change — rejected: Composio webhooks are for app events, not connection state changes

### R-003: Activity Feed Data Source

**Decision**: Activity feed reads from `workflow_runs` table joined with `agent_modules`. Each workflow run stores structured output (JSON) with findings, KPIs, actions taken. A daily summary is computed on-the-fly from the day's runs.

**Rationale**: Workflow runs already exist. Adding structured `output_data` (JSONB) to runs provides the data for activity items, artifacts, and KPIs without a separate activity table.

**Alternatives considered**:

- Separate `agent_activity_log` table — rejected: duplicates workflow_runs data
- Real-time subscriptions via Supabase Realtime — considered for future, not needed for MVP (cron runs every 15min, page refresh is sufficient)

### R-004: Artifact Panel Architecture

**Decision**: Artifacts are rendered client-side from workflow run output data. Each artifact type (cart-table, channels, conversions, approval) is a separate component that receives typed data.

**Rationale**: Artifacts are rich interactive views (tables, progress bars, approval buttons). They must be Client Components. The data comes from the `output_data` JSONB column of the workflow run, parsed into typed interfaces.

**Alternatives considered**:

- Server-rendered artifacts — rejected: need interactivity (approval buttons, resize)
- Markdown-based artifacts — rejected: can't render tables, progress bars, approval flows

### R-005: Skill System Migration

**Decision**: Remove `agent_skills` table usage for executable capabilities. Keep the table but repurpose it for "Agent Context" (prompt knowledge only). New `agent_modules` table handles executable capabilities.

**Rationale**: Clean separation: modules = what the agent DOES (executable), context = what the agent KNOWS (prompt injection). Existing skills that are knowledge/procedure text become agent context entries. The agent_skills table schema can be reused with a `type` column distinguishing `context` from the deprecated `knowledge`/`procedure` types.

**Alternatives considered**:

- Drop agent_skills entirely — rejected: existing agents have useful knowledge skills that should migrate as context
- Merge modules into agent_skills — rejected: fundamentally different concepts (executable vs text)

### R-006: Install Flow Architecture

**Decision**: Install wizard modal → connection tour → server action `installAgent()` → provisions agent + modules + workflows in single transaction → redirect to installed agent page.

**Rationale**: Single server action ensures atomicity. If any step fails, nothing is created. Connection tour runs before provisioning to verify connections exist. The `installAgent()` action reads the module registry for the agent type and creates everything.

**Alternatives considered**:

- Client-side multi-step creation — rejected: no atomicity, partial state on failure
- Background job for provisioning — rejected: adds complexity, user waits anyway

## Phase 1: Data Model

### New Tables

**`agent_modules`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| agent_id | uuid FK → agents | |
| module_type | text | e.g., `abandoned-cart`, `conversion-optimizer`, `urgency-manager`, `upsell-engine` |
| name | text | Display name |
| description | text | What this module does |
| enabled | boolean | User toggle, default true |
| required_connections | jsonb | Array of connection identifiers, e.g., `["nuvemshop", "whatsapp"]` |
| config | jsonb | Module-specific settings (thresholds, timing, etc.) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Indexes**: `(agent_id)`, unique `(agent_id, module_type)`
**RLS**: Team-scoped via agents → team_members chain

**`workflow_run_outputs`** (extends existing workflow_runs)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workflow_run_id | uuid FK → workflow_runs | |
| module_id | uuid FK → agent_modules | |
| output_type | text | `cart-table`, `channel-performance`, `conversion-list`, `message-approval`, `kpi-summary` |
| output_data | jsonb | Structured data matching artifact type |
| summary_text | text | Human-readable summary for activity feed label |
| created_at | timestamptz | |

**Indexes**: `(module_id, created_at DESC)`, `(workflow_run_id)`
**RLS**: Team-scoped via agent_modules → agents → team_members

### Modified Tables

**`agent_workflows`** — add column:
| Column | Type | Notes |
|---|---|---|
| module_id | uuid FK → agent_modules, nullable | Links workflow to its owning module. Null for legacy non-module workflows |

**`agents`** — add column:
| Column | Type | Notes |
|---|---|---|
| agent_type | text, nullable | e.g., `carrinho-conversao`. Null for legacy manually-created agents. Used to prevent duplicate installs |

### Schema for `agent_skills` cleanup:

- Add `type` column: `context` (new), `knowledge` (deprecated), `procedure` (deprecated)
- Existing rows get `type = 'context'` via migration
- UI only creates/shows `context` type going forward

### Output Data Schemas (JSONB)

**Cart Table** (`output_type: 'cart-table'`):

```json
{
  "carts": [
    {
      "customer_name": "Ana Lima",
      "product": "Kit Skincare Premium XL",
      "value": 189,
      "abandoned_ago": "2h",
      "status": "enviado"
    }
  ],
  "total_detected": 47,
  "total_recovered": 3,
  "total_value_at_risk": 3840
}
```

**Channel Performance** (`output_type: 'channel-performance'`):

```json
{
  "channels": [
    { "name": "WhatsApp", "sent": 31, "converted": 2, "conversion_rate": 0.065 },
    { "name": "E-mail", "sent": 16, "converted": 1, "conversion_rate": 0.0625 }
  ],
  "insight": "WhatsApp teve taxa de resposta mais alta..."
}
```

**Conversion List** (`output_type: 'conversion-list'`):

```json
{
  "conversions": [
    {
      "customer_name": "Bruno Matos",
      "product": "Serum Vitamina C 30ml",
      "value": 97,
      "channel": "WhatsApp"
    }
  ],
  "total_recovered_value": 529,
  "insight": "A Mariana foi a mais rapida..."
}
```

**Message Approval** (`output_type: 'message-approval'`):

```json
{
  "template": "Oi [Nome]! Vi que voce deixou o [Produto] no carrinho...",
  "store_name": "Loja Online",
  "recipient_count": 44,
  "scheduled_for": "2026-03-18T10:00:00Z",
  "status": "pending_approval"
}
```

**Category Donut Chart** (`output_type: 'category-chart'`):

```json
{
  "categories": [
    { "name": "Rastreio de pedido", "count": 58, "color": "#7C6EBF" },
    { "name": "Prazo de entrega", "count": 41, "color": "#B0B0B0" },
    { "name": "Trocas e devolucoes", "count": 28, "color": "#E8A838" },
    { "name": "Duvidas de produto", "count": 19, "color": "#E8A838" },
    { "name": "Problemas de pagamento", "count": 10, "color": "#E85050" }
  ],
  "total": 156,
  "insight": "Trocas e devolucoes subiram 8% em relacao a ontem..."
}
```

**Escalation Cards** (`output_type: 'escalation-cards'`):

```json
{
  "cases": [
    {
      "customer_name": "Maria Fernandes",
      "status": "andamento",
      "problem": "Pedido com 14 dias de atraso — transportadora sem atualizacao",
      "action_taken": "Abri reclamacao na transportadora e enviei update para a cliente",
      "escalation_reason": "Prazo acima do meu limite de resolucao automatica"
    }
  ]
}
```

**KPI Summary** (`output_type: 'kpi-summary'`):

```json
{
  "kpis": [
    { "label": "carrinhos hoje", "value": "47" },
    { "label": "ja recuperados", "value": "3" },
    { "label": "receita de volta", "value": "R$890" }
  ],
  "summary": "Trabalhei nos carrinhos enquanto voce dormia..."
}
```

### Module Registry (Code, not DB)

The module registry maps agent types to their module definitions. Lives in `src/lib/modules/registry.ts`:

```
carrinho-conversao:
  modules:
    - abandoned-cart:
        name: "Abandoned Cart"
        required_connections: ["nuvemshop"]
        workflows:
          - trigger: cron "*/15 * * * *"
            steps: [check_abandoned_carts, send_recovery_messages, track_recoveries]
          - trigger: cron "0 10 * * *"
            steps: [send_second_touch]
    - conversion-optimizer:
        name: "Conversion Optimizer"
        required_connections: ["nuvemshop"]
        workflows:
          - trigger: cron "0 6 * * 1"
            steps: [analyze_checkout_funnel, generate_friction_report]
    - urgency-manager:
        name: "Urgency Manager"
        required_connections: ["nuvemshop"]
        workflows:
          - trigger: cron "0 */4 * * *"
            steps: [check_low_stock_products, generate_urgency_alerts]
    - upsell-engine:
        name: "Upsell Engine"
        required_connections: ["nuvemshop"]
        workflows:
          - trigger: cron "0 8 * * *"
            steps: [analyze_purchase_affinity, generate_bundle_recommendations, send_post_purchase_upsell]
```

## Contracts

### Server Actions

**`installAgent(agentType: string, teamId: string, userId: string)`**

- Creates agent row with `agent_type`
- Creates all modules from registry
- Creates all workflows from module definitions
- Returns `{ agentId: string }` or `{ error: string }`

**`toggleModule(moduleId: string, enabled: boolean)`**

- Updates `agent_modules.enabled`
- Pauses/resumes associated workflows
- Returns `{ success: boolean }`

**`approveMessage(runOutputId: string)`**

- Marks message-approval output as approved
- Triggers scheduled send workflow
- Returns `{ success: boolean }`

### Query Functions

**`fetchAgentActivity(agentId: string, date?: string)`**

- Returns: `{ summary: string, kpis: KPI[], actions: ActionLogItem[] }`
- Aggregates from workflow_run_outputs for the given date

**`fetchAgentModules(agentId: string)`**

- Returns: `{ modules: ModuleWithStatus[] }`
- Computes status from enabled + connections + last run

**`fetchArtifact(runOutputId: string)`**

- Returns: typed artifact data based on `output_type`

## Quickstart

1. Run migrations to create `agent_modules`, add `module_id` to `agent_workflows`, add `agent_type` to `agents`, create `workflow_run_outputs`
2. Implement module registry with Carrinho & Conversao definition
3. Implement `installAgent()` server action
4. Update install wizard to call `installAgent()` instead of just creating an agent row
5. Build installed agent page with activity feed (reading from workflow_run_outputs)
6. Migrate existing `checkAbandonedCarts()` to produce workflow_run_outputs
7. Build artifact panel components (4 types)
8. Build module management UI (configure tab)
9. Clean up old skills system
10. Verify end-to-end: install → modules active → cron runs → activity shows real data
