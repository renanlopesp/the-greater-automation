# API Contract: Orchestrator Provisioning & Management

**Date**: 2026-03-19

## Provisioning (Internal)

### provisionStore() — Modified

The `provisionStore` function in `src/lib/retail/provision-store.ts` always creates the orchestrator, regardless of selected priorities.

**Behavior**:

1. Create store record (existing)
2. **Always** create orchestrator agent with `is_orchestrator=true` if not already present
3. Create specialist agents only if priorities are selected (existing)
4. Create workflows (existing)
5. Set `has_store=true` (existing)

**Idempotency**: Check if an orchestrator already exists before creating. Skip if found.

## Dashboard Layout Data

### GET /dashboard (Server Component)

The dashboard layout already fetches `orchestratorId` via:

```sql
SELECT id FROM agents WHERE team_id = ? AND is_orchestrator = true LIMIT 1
```

This ID is passed to the sidebar (for "Novo Chat" link) and greeting section (for input routing).

**No API changes needed** — the layout already provides `orchestratorId` to child components.

## Orchestrator Resolution

### GET /chat (Server Component)

New page that resolves the orchestrator:

```sql
SELECT id, name FROM agents WHERE team_id = ? AND is_orchestrator = true LIMIT 1
```

**Error handling**: If no orchestrator found (legacy workspace), show an informative message or auto-create one.

## Catalog Exclusion

The discover/agents page already filters agents. The orchestrator must be excluded:

- Sidebar "ativos" section: Only shows agents with `agent_type IS NOT NULL` (orchestrator has `agent_type = NULL`)
- Discover catalog: Uses `CATALOG_ID_TO_AGENT_TYPE` mapping (orchestrator not in catalog)
- Both naturally exclude the orchestrator without code changes
