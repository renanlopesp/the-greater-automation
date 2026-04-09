# MCP Tools Contract

**Date**: 2026-04-09

## Server Identity

| Field     | Value      |
| --------- | ---------- |
| name      | snew-tools |
| version   | 1.0.0      |
| transport | stdio      |

## Environment Variables (Required)

| Variable                  | Required | Description                                     |
| ------------------------- | -------- | ----------------------------------------------- |
| SUPABASE_URL              | Yes      | Supabase project URL                            |
| SUPABASE_SERVICE_ROLE_KEY | Yes      | Supabase service role key                       |
| SNEW_TEAM_ID              | Yes      | Current team UUID                               |
| SNEW_USER_ID              | Yes      | Current user UUID                               |
| SNEW_STORE_ID             | No       | Store UUID (enables STORE\_\* tools)            |
| SNEW_TASK_ID              | No       | Active task UUID (enables SNEW_MODIFY_ARTIFACT) |

## Tool Registry

### Platform Tools (SNEW\_\*) — Always registered

| Tool                       | Input                                                                       | Output (key fields)                                              |
| -------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| SNEW_LIST_SKILLS           | (none)                                                                      | `{ skills: [...], count }`                                       |
| SNEW_GET_SKILL             | `{ skill_slug: string }`                                                    | `{ slug, name, description, category, status, last_executions }` |
| SNEW_RUN_SKILL             | `{ skill_slug: string, input?: object }`                                    | `{ execution_id, status, output, duration_ms }`                  |
| SNEW_ACTIVATE_SKILL        | `{ skill_slug: string }`                                                    | `{ success, slug, name, message }`                               |
| SNEW_GET_SKILLS_ACTIVITY   | (none)                                                                      | `{ total_active_skills, skills: [...] }`                         |
| SNEW_LIST_WORKFLOWS        | `{ agent_id?: string }`                                                     | `{ workflows: [...], count }`                                    |
| SNEW_RUN_WORKFLOW          | `{ workflow_id: string, input_data?: object }`                              | `{ success, run_id, workflow_name }`                             |
| SNEW_LIST_RUNS             | `{ agent_id?: string, workflow_id?: string, limit?: number }`               | `{ runs: [...], count }`                                         |
| SNEW_CREATE_SKILL          | `{ agent_id: string, name: string, content: string, description?: string }` | `{ success, skill_id, name, type }`                              |
| SNEW_CHECK_CONNECTIONS     | (none)                                                                      | `{ connected_apps: [...], count }`                               |
| SNEW_LIST_AVAILABLE_APPS   | (none)                                                                      | `{ total, connected: {...}, not_connected: {...} }`              |
| SNEW_LIST_APP_CAPABILITIES | `{ app_id: string }`                                                        | `{ app_id, actions_count, actions, triggers_count, triggers }`   |
| SNEW_CREATE_NOTIFICATION   | `{ urgency: enum, title: string, body?: string, cta_url?: string }`         | `{ success, notification_id, message }`                          |

### Platform Tools (SNEW\_\*) — Conditional (requires SNEW_TASK_ID)

| Tool                 | Input                                                                                | Output (key fields)    |
| -------------------- | ------------------------------------------------------------------------------------ | ---------------------- |
| SNEW_MODIFY_ARTIFACT | `{ operation: enum, date_ids?: string[], except?: boolean, artifact_data?: object }` | `{ success, message }` |

### Retail Tools (STORE\_\*) — Conditional (requires SNEW_STORE_ID)

| Tool                          | Input (key params)                                    | Output (key fields)                           |
| ----------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| STORE_QUERY_STOCK             | `{ search?, category?, low_stock_only?, limit? }`     | `{ products: [...], total, low_stock_count }` |
| STORE_QUERY_SALES             | `{ period: enum, start_date?, end_date?, group_by? }` | `{ summary, products: [...], period }`        |
| STORE_LIST_ORDERS             | `{ status?, limit?, offset? }`                        | `{ orders: [...], total }`                    |
| STORE_UPDATE_ALERT            | `{ product_id: string, threshold: number }`           | `{ success, product_id }`                     |
| STORE_UPDATE_SCHEDULE         | `{ schedule: object }`                                | `{ success }`                                 |
| STORE_DELETE_PRODUCT          | `{ product_ids?: string[], search?: string }`         | `{ deleted_count, deleted_ids }`              |
| STORE_TRIGGER_SYNC            | (none)                                                | `{ success, synced_count }`                   |
| STORE_UPDATE_PRODUCT          | `{ product_id: string, updates: object }`             | `{ success, product }`                        |
| STORE_CREATE_PRODUCT          | `{ name: string, price: number, ...}`                 | `{ success, product_id }`                     |
| STORE_QUERY_CATEGORIES        | (none)                                                | `{ categories: [...] }`                       |
| STORE_MANAGE_CATEGORIES       | `{ action: enum, ...}`                                | `{ success, category }`                       |
| STORE_QUERY_CUSTOMERS         | `{ search?, segment?, limit? }`                       | `{ customers: [...], segments }`              |
| STORE_MANAGE_COUPONS          | `{ action: enum, ...}`                                | `{ success, coupon }`                         |
| STORE_MANAGE_ORDERS           | `{ action: enum, order_id: string, ...}`              | `{ success, order }`                          |
| STORE_GET_ABANDONED_CHECKOUTS | `{ limit? }`                                          | `{ checkouts: [...], total }`                 |
| STORE_ADD_PRODUCT_IMAGE       | `{ product_id: string, image_url: string }`           | `{ success, image_id }`                       |
| STORE_MANAGE_DRAFT_ORDERS     | `{ action: enum, ...}`                                | `{ success, draft_order }`                    |
| STORE_MANAGE_FULFILLMENT      | `{ action: enum, order_id: string, ...}`              | `{ success }`                                 |
| STORE_GET_PAYMENT_OPTIONS     | (none)                                                | `{ payment_options: [...] }`                  |
| STORE_QUERY_TRANSACTIONS      | `{ period?, status? }`                                | `{ transactions: [...], total }`              |
| STORE_MANAGE_PAGES            | `{ action: enum, ...}`                                | `{ success, page }`                           |
| STORE_GET_STORE_INFO          | (none)                                                | `{ store: {...} }`                            |
| STORE_QUERY_MARGINS           | `{ product_ids?: string[] }`                          | `{ margins: [...] }`                          |

## Error Response Format

All tools return errors in the same shape:

```json
{
  "content": [{ "type": "text", "text": "{\"error\": \"Descriptive error message\"}" }],
  "isError": true
}
```
