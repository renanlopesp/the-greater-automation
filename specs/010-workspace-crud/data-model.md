# Data Model: Workspace CRUD Actions

**Feature**: 010-workspace-crud
**Date**: 2026-02-10

## Existing Entities (No Schema Changes Required)

All entities already exist in the database. This feature adds application-level CRUD operations on top of the existing schema.

### Workflow

| Field        | Type                 | Notes                                   |
| ------------ | -------------------- | --------------------------------------- |
| id           | uuid (PK)            | Auto-generated                          |
| team_id      | uuid (FK → teams)    | Required                                |
| folder_id    | uuid (FK → folders)  | Nullable                                |
| name         | text                 | Required, default "Untitled Workflow"   |
| emoji        | text                 | Nullable, default "📋"                  |
| description  | text                 | Nullable                                |
| status       | workflow_status enum | 'draft' or 'published', default 'draft' |
| is_starred   | boolean              | Default false                           |
| created_by   | uuid (FK → profiles) | Required                                |
| published_at | timestamptz          | Nullable, set when status → published   |
| created_at   | timestamptz          | Auto                                    |
| updated_at   | timestamptz          | Auto                                    |

**Relationships**: Has many workflow_steps, has one workflow_trigger, has many workflow_runs, optionally belongs to agent (via agent_skills).

### Agent

| Field       | Type                 | Notes          |
| ----------- | -------------------- | -------------- |
| id          | uuid (PK)            | Auto-generated |
| team_id     | uuid (FK → teams)    | Required       |
| name        | text                 | Required       |
| description | text                 | Nullable       |
| avatar_url  | text                 | Nullable       |
| avatar_type | text                 | Nullable       |
| palette     | text                 | Default value  |
| created_by  | uuid (FK → profiles) | Required       |
| created_at  | timestamptz          | Auto           |
| updated_at  | timestamptz          | Auto           |

**Relationships**: Has many agent_skills (linking to workflows).

### Workflow Step

| Field       | Type                  | Notes                                                                       |
| ----------- | --------------------- | --------------------------------------------------------------------------- |
| id          | uuid (PK)             | Auto-generated                                                              |
| workflow_id | uuid (FK → workflows) | Required                                                                    |
| position    | integer               | Order within workflow                                                       |
| type        | step_type enum        | app, ai, flow_control, web_scraping, human_in_loop, utility, http, sequence |
| name        | text                  | Required                                                                    |
| config      | jsonb                 | Step-specific configuration                                                 |
| created_at  | timestamptz           | Auto                                                                        |
| updated_at  | timestamptz           | Auto                                                                        |

### Workflow Trigger

| Field       | Type                  | Notes                                                            |
| ----------- | --------------------- | ---------------------------------------------------------------- |
| id          | uuid (PK)             | Auto-generated                                                   |
| workflow_id | uuid (FK → workflows) | One-to-one                                                       |
| type        | trigger_type enum     | manual, scheduled, webhook, form, rss, mailhook, table, mcp, app |
| config      | jsonb                 | Trigger-specific configuration                                   |
| created_at  | timestamptz           | Auto                                                             |
| updated_at  | timestamptz           | Auto                                                             |

### Workflow Run

| Field           | Type                  | Notes                                          |
| --------------- | --------------------- | ---------------------------------------------- |
| id              | uuid (PK)             | Auto-generated                                 |
| workflow_id     | uuid (FK → workflows) | Required                                       |
| agent_id        | uuid (FK → agents)    | Nullable                                       |
| status          | run_status enum       | pending, running, completed, failed, cancelled |
| steps_used      | integer               | Default 0                                      |
| ai_credits_used | integer               | Default 0                                      |
| started_at      | timestamptz           | Nullable                                       |
| completed_at    | timestamptz           | Nullable                                       |
| created_at      | timestamptz           | Auto                                           |

### Agent Skills (Junction Table)

| Field       | Type                  | Notes              |
| ----------- | --------------------- | ------------------ |
| id          | uuid (PK)             | Auto-generated     |
| agent_id    | uuid (FK → agents)    | Required           |
| workflow_id | uuid (FK → workflows) | Required           |
| name        | text                  | Skill display name |
| last_run_at | timestamptz           | Nullable           |
| run_count   | integer               | Default 0          |
| created_at  | timestamptz           | Auto               |
| updated_at  | timestamptz           | Auto               |

## New Application-Level Entity (Not Persisted)

### Workflow Template

Hardcoded TypeScript configuration, not a database table.

| Field       | Type            | Notes                                       |
| ----------- | --------------- | ------------------------------------------- |
| id          | string          | Unique template identifier                  |
| name        | string          | Display name (e.g., "Email Automation")     |
| description | string          | Brief description of what the template does |
| emoji       | string          | Template emoji icon                         |
| steps       | TemplateStep[]  | Pre-configured steps to create              |
| trigger     | TemplateTrigger | Pre-configured trigger                      |

### TemplateStep

| Field    | Type     | Notes                 |
| -------- | -------- | --------------------- |
| position | number   | Order in workflow     |
| type     | StepType | Step type enum value  |
| name     | string   | Step display name     |
| config   | object   | Default configuration |

### TemplateTrigger

| Field  | Type        | Notes                   |
| ------ | ----------- | ----------------------- |
| type   | TriggerType | Trigger type enum value |
| config | object      | Default configuration   |

## State Transitions

### Workflow Status

```
draft → published (via status change action, sets published_at)
published → draft (via status change action, clears published_at)
```

### Delete Cascade

```
Delete Workflow:
  → Delete workflow_steps (FK cascade)
  → Delete workflow_triggers (FK cascade)
  → Delete workflow_runs (FK cascade)
  → Delete agent_skills referencing this workflow (FK cascade)

Delete Agent:
  → Delete agent_skills (FK cascade, orphans workflows as standalone)
  → Workflows remain with agent_id effectively null (via agent_skills removal)
```
