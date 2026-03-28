import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncProducts, syncOrders } from '@/lib/nuvemshop/sync'
import { checkAbandonedCarts, checkRecoveredCarts } from '@/lib/retail/abandoned-cart'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/nuvemshop/cron')

// Vercel Cron or external cron hits this endpoint every 15 minutes
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find all Nuvemshop stores that haven't synced in 15+ minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, team_id')
    .eq('platform', 'nuvemshop')
    .not('platform_access_token', 'is', null)
    .or(`last_sync_at.is.null,last_sync_at.lt.${fifteenMinutesAgo}`)

  if (!stores || stores.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No stores need syncing' })
  }

  const settled = await Promise.allSettled(
    stores.map(async (store) => {
      const [productSettled, orderSettled] = await Promise.allSettled([
        syncProducts(store.id),
        syncOrders(store.id),
      ])
      const productResult =
        productSettled.status === 'fulfilled'
          ? productSettled.value
          : { synced: 0, created: 0, updated: 0, errors: 0 }
      const orderResult =
        orderSettled.status === 'fulfilled'
          ? orderSettled.value
          : { synced: 0, created: 0, updated: 0, errors: 0 }

      // Check abandoned carts and recoveries (best-effort, don't fail the sync)
      let abandonedNotified = 0
      let cartRecovered = 0
      try {
        // Create an agent_workflow_run record for the abandoned-cart module workflow.
        // Returns a run ID if the module-based agent is installed, null otherwise.
        const agentRunId = await createAbandonedCartAgentRun(supabase, store.team_id)

        const [abandoned, recovered] = await Promise.all([
          checkAbandonedCarts(store.id, agentRunId ?? undefined),
          checkRecoveredCarts(store.id, agentRunId ?? undefined),
        ])
        abandonedNotified = abandoned.notified
        cartRecovered = recovered.recovered

        // Mark the run as completed
        if (agentRunId) {
          await finishAgentWorkflowRun(supabase, agentRunId, 'completed')
        }
      } catch {
        // Non-critical — don't fail the sync cycle
      }

      return {
        store_id: store.id,
        name: store.name,
        status: 'success' as const,
        products: productResult.synced,
        orders: orderResult.synced,
        abandoned_carts_notified: abandonedNotified,
        carts_recovered: cartRecovered,
      }
    })
  )

  const results = settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          store_id: stores[i].id,
          name: stores[i].name,
          status: `error: ${r.reason instanceof Error ? r.reason.message : 'unknown'}`,
        }
  )

  return NextResponse.json({ synced: results.length, results })
}

/**
 * Finds the abandoned-cart module workflow for this team's carrinho-conversao agent,
 * creates an agent_workflow_run record, and returns the run ID.
 * Returns null if no module-based agent is installed (non-fatal, graceful degradation).
 */
async function createAbandonedCartAgentRun(
  supabase: ReturnType<typeof createServiceRoleClient>,
  teamId: string
): Promise<string | null> {
  try {
    // Find agent with agent_type='carrinho-conversao' for this team
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('team_id', teamId)
      .eq('agent_type' as never, 'carrinho-conversao')
      .maybeSingle()

    if (!agent) return null

    // Find the abandoned-cart module's workflow (first cron workflow)
    const { data: workflow } = await (
      supabase as never as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              k: string,
              v: unknown
            ) => {
              eq: (
                k: string,
                v: unknown
              ) => {
                limit: (n: number) => {
                  maybeSingle: () => Promise<{ data: { id: string } | null }>
                }
              }
            }
          }
        }
      }
    )
      .from('agent_workflows')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('module_id' as never, await getAbandonedCartModuleId(supabase, agent.id))
      .limit(1)
      .maybeSingle()

    if (!workflow) return null

    // Create an agent_workflow_run record
    const { data: run } = await supabase
      .from('agent_workflow_runs')
      .insert({
        agent_id: agent.id,
        workflow_id: workflow.id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    return run?.id ?? null
  } catch (err) {
    log.warn({ err }, 'Failed to create abandoned-cart agent workflow run')
    return null
  }
}

async function getAbandonedCartModuleId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  agentId: string
): Promise<string> {
  const { data } = await (
    supabase as never as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            k: string,
            v: unknown
          ) => {
            eq: (
              k: string,
              v: unknown
            ) => {
              maybeSingle: () => Promise<{ data: { id: string } | null }>
            }
          }
        }
      }
    }
  )
    .from('agent_modules')
    .select('id')
    .eq('agent_id', agentId)
    .eq('module_type', 'abandoned-cart')
    .maybeSingle()

  return (data as { id: string } | null)?.id ?? ''
}

async function finishAgentWorkflowRun(
  supabase: ReturnType<typeof createServiceRoleClient>,
  runId: string,
  status: 'completed' | 'failed'
): Promise<void> {
  try {
    await supabase
      .from('agent_workflow_runs')
      .update({ status, completed_at: new Date().toISOString() })
      .eq('id', runId)
  } catch {
    // Non-fatal
  }
}
