# Legacy Migrations Archive (pre-2026-04-15)

These 108 migration files were generated against the previous Supabase project
(`djohaxwfketlsjurwqne`) and subsequent branch experiments. When production was
moved to `apsfeutbqvgfgznmaesg` on 2026-04-01, most of these migrations were
never re-applied — the new project was seeded from a different baseline and has
drifted significantly from what the files describe.

As of 2026-04-15, production (`apsfeutbqvgfgznmaesg`) has only 7 migrations
applied:

- 20260331142020 create_tasks_table
- 20260331142032 add_task_id_columns
- 20260331145229 create_plans_table
- 20260406235752 create_chat_uploads_bucket
- 20260409180043 add_anthropic_agent_columns
- 20260411194823 recreate_messaging_links_correct_schema
- 20260411195519 create_telegram_message_queue

Plus `20260415000000_add_report_kind_to_agents.sql` (now live in
`supabase/migrations/`) was applied via MCP on 2026-04-15.

## Current source of truth

- **Structural**: `src/types/database.ts` — regenerated via
  `mcp__plugin_supabase_supabase__generate_typescript_types` against
  `apsfeutbqvgfgznmaesg`. This file is the authoritative type-level snapshot
  of the live schema.
- **DDL**: future migrations must be authored against this baseline. Use
  `mcp__plugin_supabase_supabase__apply_migration` to apply and track.

## When to consult this archive

- **Historical context** on how a table or column came to exist.
- **Recovering a feature**: if a feature was gated in the old project but
  shipped in the new one, search for the relevant `CREATE TABLE` / `ALTER
TABLE` here to understand the schema the code expected.
- **Never re-apply** these files directly — they will conflict with current
  state and may destroy data.

## Code drift (known)

The move from the old project to `apsfeutbqvgfgznmaesg` left several features
referencing columns or tables that no longer exist. Known drift at archival
time:

| Table / Column referenced by code                                       | Actual state in prod                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `agents.notification_settings` (jsonb)                                  | Split into separate `agent_notification_settings` table              |
| `message_feedback.feedback`                                             | Columns are `rating` + `comment`                                     |
| `notifications.type`, `notifications.workflow_id`                       | Neither exists; `urgency`, `source_agent_id` are the current columns |
| `agent_skills.parameters`                                               | Replaced by `metadata` jsonb                                         |
| `app_connections.app_id`, `app_connections.composio_connection_id`      | Replaced by `app_name` + `credentials` jsonb                         |
| `store_stock_alerts.is_enabled`                                         | Column does not exist                                                |
| `store_suppliers.min_order_value`                                       | Column does not exist                                                |
| `store_orders.order_number`                                             | Use `platform_order_id` or `external_id`                             |
| `store_price_monitors.own_product_id`, `previous_price`, `product_name` | Columns do not exist                                                 |

These are tracked in spec `071-remove-any-casts` — the type regeneration made
the drift visible. A follow-up task will either reconcile the code to the
current schema or add migrations to restore the missing columns after a
product review.
