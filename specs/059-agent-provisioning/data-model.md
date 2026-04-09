# Data Model: Agent Provisioning + Onboarding

**Date**: 2026-04-09

## Schema Changes

### teams table — New Columns

| Column             | Type | Nullable | Default | Description                                               |
| ------------------ | ---- | -------- | ------- | --------------------------------------------------------- |
| anthropic_agent_id | text | Yes      | null    | Managed Agent ID from Anthropic (e.g., `agent_011CZs...`) |
| anthropic_env_id   | text | Yes      | null    | Environment ID from Anthropic (e.g., `env_01C1hH...`)     |

**Migration**: `ALTER TABLE teams ADD COLUMN anthropic_agent_id text; ALTER TABLE teams ADD COLUMN anthropic_env_id text;`

**Notes**:

- Both columns are nullable because teams provisioned before this migration won't have agents yet
- Columns are populated by `POST /api/agents/provision`
- Idempotency check: if both columns are non-null, provisioning returns existing values

## Key Entities

### Team (extended)

| Field                  | Type | Description               |
| ---------------------- | ---- | ------------------------- |
| id                     | UUID | Primary key               |
| name                   | text | Team/workspace name       |
| anthropic_agent_id     | text | Managed Agent ID (new)    |
| anthropic_env_id       | text | Environment ID (new)      |
| stripe_subscription_id | text | For determining plan tier |

### Brand DNA (existing, read-only)

| Field          | Type   | Used For                                   |
| -------------- | ------ | ------------------------------------------ |
| niche          | text   | Full mode prompt — business context        |
| tone           | text   | Full mode prompt — communication style     |
| audience       | text   | Full mode prompt — target customer         |
| positioning    | text   | Full mode prompt — market position         |
| words_to_use   | text[] | Full mode prompt — vocabulary guidance     |
| words_to_avoid | text[] | Full mode prompt — vocabulary restrictions |
| store_name     | text   | Full mode prompt — brand identity          |

### System Prompt Modes

| Mode       | When Used                | Includes                                                                                 |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| onboarding | Agent created at signup  | Setup guidance, store connection instructions, generic personality                       |
| full       | After brand DNA analysis | Brand tone, audience, palette, product context, retail/marketing tools, full personality |

## State Transitions

```
Team created → no agent (agent_id = null)
    ↓ POST /api/agents/provision
Agent provisioned → agent_id + env_id set, mode = onboarding
    ↓ POST /api/agents/update-prompt (after brand DNA)
Agent personalized → same agent_id, mode = full
    ↓ (optional: plan upgrade)
Agent upgraded → same agent_id, model changed
```
