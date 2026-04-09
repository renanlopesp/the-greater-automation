# Data Model: MCP Tools Server

**Date**: 2026-04-09

## Schema Changes

**None.** This feature does not modify any database tables. The MCP server reads and writes using the same Supabase tables that the existing tools already use.

## Key Entities (In-Memory)

### ToolContext

Represents the session-scoped context passed to every tool execution.

| Field    | Type           | Required | Source                                                    |
| -------- | -------------- | -------- | --------------------------------------------------------- |
| teamId   | string (UUID)  | Yes      | `SNEW_TEAM_ID` env var                                    |
| userId   | string (UUID)  | Yes      | `SNEW_USER_ID` env var                                    |
| storeId  | string (UUID)  | No       | `SNEW_STORE_ID` env var                                   |
| taskId   | string (UUID)  | No       | `SNEW_TASK_ID` env var                                    |
| supabase | SupabaseClient | Yes      | Created from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |

### ToolResult

The standard return type from all execute functions.

| Field    | Type   | Description                                                               |
| -------- | ------ | ------------------------------------------------------------------------- |
| (varies) | object | Each tool returns its own shape (e.g., `{ sales: [...], total: number }`) |
| error    | string | Present only on failure, replaces all other fields                        |

### MCP Tool Response

The wrapper format returned to the MCP client (Managed Agent).

| Field   | Type                                  | Description                                  |
| ------- | ------------------------------------- | -------------------------------------------- |
| content | Array<{ type: 'text', text: string }> | JSON-serialized ToolResult                   |
| isError | boolean                               | true when ToolResult contains an error field |

## Existing Tables Used (Read/Write)

| Table               | Tools that use it                                                                                            | Access               |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------- |
| skills              | SNEW_LIST_SKILLS, SNEW_GET_SKILL, SNEW_RUN_SKILL, SNEW_ACTIVATE_SKILL, SNEW_GET_SKILLS_ACTIVITY              | Read + Update        |
| skill_executions    | SNEW_GET_SKILL, SNEW_GET_SKILLS_ACTIVITY                                                                     | Read                 |
| tasks               | SNEW_MODIFY_ARTIFACT, SNEW_RUN_SKILL                                                                         | Read + Update        |
| notifications       | SNEW_CREATE_NOTIFICATION                                                                                     | Insert               |
| agent_workflows     | SNEW_LIST_WORKFLOWS, SNEW_RUN_WORKFLOW                                                                       | Read + Insert (runs) |
| agent_workflow_runs | SNEW_LIST_RUNS, SNEW_RUN_WORKFLOW                                                                            | Read + Insert        |
| agents              | SNEW_LIST_WORKFLOWS                                                                                          | Read                 |
| agent_skills        | SNEW_CREATE_SKILL                                                                                            | Insert               |
| store_products      | STORE_QUERY_STOCK, STORE_DELETE_PRODUCT, STORE_UPDATE_PRODUCT, STORE_CREATE_PRODUCT, STORE_ADD_PRODUCT_IMAGE | Read + Write         |
| stores              | STORE_GET_STORE_INFO, STORE_TRIGGER_SYNC, SNEW_RUN_SKILL (calendar)                                          | Read                 |
| brand_dna           | SNEW_RUN_SKILL (calendar)                                                                                    | Read                 |
| app_connections     | SNEW_CHECK_CONNECTIONS (fallback)                                                                            | Read                 |
