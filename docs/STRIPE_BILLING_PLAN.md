# Stripe Billing + Feature Gating + Workspace Connections

## Context

The billing system is 100% static — "Free" hardcoded in UI, "Upgrade plan" shows a toast, no Stripe integration, no plans table, no usage enforcement. Team features (members, workspace connections) need to be gated behind paid plans. This plan covers:

1. **Stripe integration** — checkout, webhooks, customer portal
2. **3-tier plan system** — Free / Pro / Enterprise with feature flags
3. **Feature gating** — team features (members, connections) require Pro+
4. **Usage enforcement** — step/credit limits enforced before workflow execution
5. **Usage aggregation** — automated rollup from workflow_runs → usage table
6. **Workspace connections visibility** — team members see connected apps in workspace (Pro+)

---

## Phase 1: Database — Plans, Subscriptions, Usage Aggregation

### Migration 1: `plans` table + seed data

```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,                         -- 'free', 'pro', 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT,                      -- null for free
  steps_limit INTEGER NOT NULL DEFAULT 1000,
  ai_credits_limit NUMERIC NOT NULL DEFAULT 100,
  max_team_members INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',        -- extensible feature flags
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: publicly readable (no sensitive data)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON plans FOR SELECT USING (true);

INSERT INTO plans VALUES
  ('free', 'Free', 'For individuals getting started', NULL, 1000, 100, 1,
   '{"invite_members": false, "workspace_connections": false}', 0),
  ('pro', 'Pro', 'For teams that need collaboration', NULL, 10000, 1000, 10,
   '{"invite_members": true, "workspace_connections": true}', 1),
  ('enterprise', 'Enterprise', 'For organizations at scale', NULL, 100000, 10000, 50,
   '{"invite_members": true, "workspace_connections": true, "priority_support": true}', 2);
```

### Migration 2: `subscriptions` table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT NOT NULL REFERENCES plans(id) DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: team members can read, webhooks update via service role
-- Indexes for Stripe webhook lookups
```

### Migration 3: `teams.plan_id` column + backfill

```sql
ALTER TABLE teams ADD COLUMN plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id);

-- Backfill: existing teams get free subscription
INSERT INTO subscriptions (team_id, plan_id, status)
SELECT id, 'free', 'active' FROM teams
WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.team_id = teams.id);
```

### Migration 4: Usage aggregation trigger

Closes the gap where `workflow_runs.steps_used` is never rolled up to `usage`:

```sql
CREATE FUNCTION update_team_usage_on_run_complete() ...
-- Trigger: AFTER UPDATE ON workflow_runs WHEN status → completed/failed
-- Increments usage.steps_used and usage.ai_credits_used
```

### Migration 5: Update `handle_new_user_team()`

Add subscription row creation to the auto-provisioning trigger.

### Migration 6: Workspace connections RLS (for Phase 6)

```sql
CREATE POLICY "Team members can view workspace connections"
ON app_connections FOR SELECT
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));
```

**Files to modify/create:**

- `supabase/migrations/YYYYMMDD_create_plans_table.sql` (new)
- `supabase/migrations/YYYYMMDD_create_subscriptions_table.sql` (new)
- `supabase/migrations/YYYYMMDD_add_plan_id_to_teams.sql` (new)
- `supabase/migrations/YYYYMMDD_usage_aggregation_trigger.sql` (new)
- `supabase/migrations/YYYYMMDD_update_auto_provision_function.sql` (new)
- `supabase/migrations/YYYYMMDD_workspace_connections_rls.sql` (new)
- Regenerate `src/lib/supabase/database.types.ts`

---

## Phase 2: Stripe Server Integration

### Install

```bash
bun add stripe
```

### Environment variables

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...
```

### Stripe client singleton

**New file:** `src/lib/stripe/client.ts`

- Singleton `Stripe` instance (same pattern as `src/lib/composio/client.ts`)
- Pinned API version

### Price-to-plan mapping

**New file:** `src/lib/stripe/plans.ts`

- Maps env var price IDs → plan IDs ('pro', 'enterprise')
- `planIdFromPriceId(priceId): string`

### API Routes

**`POST /api/stripe/checkout`** — `src/app/api/stripe/checkout/route.ts`

1. Auth user, verify owner role on active team
2. Look up or create Stripe customer (`stripe_customer_id` on subscriptions)
3. Create Checkout Session with `metadata: { team_id }`
4. Return `{ url }` for redirect

**`POST /api/stripe/portal`** — `src/app/api/stripe/portal/route.ts`

1. Auth user, verify owner/admin on active team
2. Look up `stripe_customer_id`
3. Create billing portal session
4. Return `{ url }` for redirect

**`POST /api/stripe/webhook`** — `src/app/api/stripe/webhook/route.ts`

- Raw body parsing + signature verification (same pattern as `src/app/api/composio/webhook/route.ts`)
- Uses `createServiceRoleClient()` to bypass RLS
- Handles 4 events:
  - `checkout.session.completed` → create/update subscription, set `teams.plan_id`, update usage limits
  - `customer.subscription.updated` → plan change, renewal, status change
  - `customer.subscription.deleted` → revert to free
  - `invoice.payment_failed` → set status `past_due`

**Files to create:**

- `src/lib/stripe/client.ts`
- `src/lib/stripe/plans.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/portal/route.ts`
- `src/app/api/stripe/webhook/route.ts`

---

## Phase 3: Feature Gating + Usage Enforcement

### Feature gate utility

**New file:** `src/lib/billing/feature-gate.ts`

```typescript
export type PlanId = 'free' | 'pro' | 'enterprise'
export interface TeamPlan {
  planId: PlanId
  features: Record<string, boolean>
  stepsLimit: number
  aiCreditsLimit: number
  maxTeamMembers: number
}

// Single JOIN query: teams → plans
export async function getTeamPlan(teamId: string): Promise<TeamPlan>
export function hasFeature(plan: TeamPlan, feature: string): boolean
export function canInviteMembers(plan: TeamPlan, currentCount: number): boolean
```

### Usage check utility

**New file:** `src/lib/billing/usage-check.ts`

```typescript
export async function checkUsageLimits(supabase, teamId): Promise<{
  allowed: boolean; reason?: string; stepsUsed; stepsLimit; ...
}>
```

### Server action gating

**File:** `src/lib/actions/members.ts` — `inviteMemberAction`

- Add `getTeamPlan()` check: `hasFeature(plan, 'invite_members')` + member count vs `maxTeamMembers`
- Return `{ error: 'Upgrade to Pro to invite team members' }` on free plan

### Usage enforcement at execution entry points

Add `checkUsageLimits()` call before workflow execution in:

- `src/app/api/composio/webhook/route.ts` (event-triggered)
- `src/lib/workflow-editor/webhook-executor.ts` (webhook-triggered)
- Any other execution entry points

**Files to create:**

- `src/lib/billing/feature-gate.ts`
- `src/lib/billing/usage-check.ts`

**Files to modify:**

- `src/lib/actions/members.ts` (add plan check)
- Workflow execution entry points (add usage check)

---

## Phase 4: Billing UI

### Extend data pipeline

**File:** `src/app/(dashboard)/layout.tsx`

- Add plan + subscription fetch to existing parallel queries (line 62):
  ```typescript
  // Add to the Promise.all alongside teams and usage:
  supabase.from('teams').select('id, name, slug, plan_id, plans(*)').eq('id', activeTeamId).single(),
  supabase.from('subscriptions').select('stripe_subscription_id, cancel_at_period_end, status').eq('team_id', activeTeamId).single(),
  ```
- Pass `planData` down through `DashboardShell` → `SettingsDialog`

### New type

**File:** `src/types/navigation.ts`

```typescript
export interface PlanData {
  planId: 'free' | 'pro' | 'enterprise'
  planName: string
  features: Record<string, boolean>
  maxTeamMembers: number
  hasStripeSubscription: boolean
  cancelAtPeriodEnd: boolean
}
```

### Redesign `BillingSection`

**File:** `src/components/settings/billing-section.tsx`

- Accept new props: `planData: PlanData`
- Show actual plan name (from DB, not hardcoded "Free")
- Show plan comparison cards (Free / Pro / Enterprise) with current plan highlighted
- "Upgrade" button → `POST /api/stripe/checkout` → redirect to Stripe
- "Manage subscription" button (paid plans only) → `POST /api/stripe/portal`
- Show `cancel_at_period_end` warning banner
- Handle `?checkout=success` query param (toast notification)

### Upgrade prompts in gated areas

**File:** `src/components/settings/members-section.tsx`

- If `planData.planId === 'free'`: hide "Invite member" button, show upgrade CTA instead

**Files to modify:**

- `src/app/(dashboard)/layout.tsx` (add plan/subscription fetch)
- `src/components/dashboard-shell.tsx` (pass planData prop)
- `src/components/settings/settings-dialog.tsx` (pass planData to sections)
- `src/components/settings/billing-section.tsx` (redesign)
- `src/components/settings/members-section.tsx` (add gate)
- `src/types/navigation.ts` (add PlanData)

---

## Phase 5: Workspace Connections Visibility (Pro+ only)

### Server action

**File:** `src/lib/composio/actions/get-app-connections.ts`

- Add `getWorkspaceConnections(teamId)` function
- Returns `{ app_id, account_label, user: { full_name, avatar_url } }[]`
- NEVER returns `composio_connection_id` (security)
- Filters out current user's own connections (already in personal list)

### Hook

**File:** `src/hooks/use-app-connections.ts`

- Add optional `teamId` param
- Fetch workspace connections in parallel (only if teamId provided)
- Return `workspaceConnections` alongside existing data

### Settings UI

**File:** `src/components/settings/manage-apps-section.tsx`

- Add "Workspace Connections" section below personal apps list (only if `hasFeature('workspace_connections')`)
- Group by app, show teammate name/avatar + account label
- "Connect your account" button for apps user hasn't connected

### Workflow/trigger editors

**Files:**

- `src/components/workflow-editor/step-config/app-step-config.tsx` (line 376)
- `src/components/workflow-editor/trigger-config/app-trigger-config.tsx`
- Split app grid into "Your apps" + "Available in workspace" sections
- Workspace apps show "Connected by [Name] — Connect your own to use" + connect button
- User cannot select workspace apps until they connect their own

### Agent detail page

**File:** `src/app/(dashboard)/agents/[id]/page.tsx` (line 124)

- Add workspace connections to agent sidebar
- Same "connect your own" pattern

---

## Existing Utilities to Reuse

| Utility                     | File                                    | Use                                                              |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `createServiceRoleClient()` | `src/lib/supabase/server.ts:47`         | Webhook handler (bypass RLS)                                     |
| `getActiveTeamId()`         | `src/lib/get-active-team.ts`            | Resolve current workspace                                        |
| `getUserTeamRole()`         | `src/lib/auth/require-role.ts`          | Auth + role checks in API routes                                 |
| `get_user_team_ids()`       | SQL function (migration 20260217172906) | RLS policy for workspace connections                             |
| `update_updated_at()`       | SQL trigger function                    | Auto-update timestamps                                           |
| Composio webhook pattern    | `src/app/api/composio/webhook/route.ts` | Reference for Stripe webhook (raw body, signature, service role) |

---

## Verification

1. **DB**: All existing teams have Free subscription after migration
2. **Stripe checkout**: Click "Upgrade" → Stripe Checkout → webhook updates plan → UI reflects Pro
3. **Stripe portal**: Paid users can manage/cancel subscription
4. **Feature gate**: Free user tries to invite member → blocked with upgrade CTA
5. **Usage enforcement**: Team at step limit → workflow execution returns 402
6. **Usage aggregation**: Run workflow → `usage.steps_used` increments automatically
7. **Workspace connections**: Pro team → Settings shows teammate connections; Free team → section hidden
8. **Workflow editor**: Pro team → shows "Available in workspace" apps; Free → only personal apps
9. **Security**: `composio_connection_id` never exposed in workspace connection queries
10. **Downgrade**: Cancel subscription → revert to Free → team features gated again
11. **Build**: `bun run build` passes
