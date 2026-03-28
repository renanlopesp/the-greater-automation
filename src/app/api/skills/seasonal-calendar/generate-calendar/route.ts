import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { generateCalendar } from '@/lib/ai/seasonal-campaign-generator'
import { getSkillId } from '@/lib/actions/seasonal-calendar'
import { safeError } from '@/lib/safe-error'

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient = createServiceRoleClient() as any

  // 2. Parse body
  const body = await request.json().catch(() => ({}))
  const year: number = (body as { year?: number }).year ?? new Date().getFullYear()

  // 3. Fetch brand_dna, store, and skill_id in parallel
  const [brandDnaResult, storeResult, skillId] = await Promise.all([
    serviceClient.from('brand_dna').select('*').eq('team_id', teamId).limit(1).single(),
    serviceClient.from('stores').select('id').eq('team_id', teamId).limit(1).single(),
    getSkillId(teamId),
  ])

  if (!brandDnaResult.data) {
    return NextResponse.json(
      { error: 'Brand DNA not found. Complete brand analysis first.' },
      { status: 400 }
    )
  }

  const brandDna = brandDnaResult.data as {
    niche: string
    audience: string
    positioning: string
    tone: string
    average_ticket: number
    opportunities: Array<{ title: string; description: string; estimated_revenue: number }>
  }

  // 4. Fetch store products (depends on store query)
  let products: Array<{ name: string; category?: string; price: number }> = []
  if (storeResult.data) {
    const { data: storeProducts } = await serviceClient
      .from('store_products')
      .select('name, price, images, category, cost_price, stock_quantity')
      .eq('store_id', (storeResult.data as { id: string }).id)
      .eq('is_published', true)
      .limit(50)
    products = (storeProducts ?? []) as Array<{ name: string; category?: string; price: number }>
  }

  // 6. Insert skill_executions record with status='running'
  const startedAt = Date.now()
  const { data: execRow } = await serviceClient
    .from('skill_executions')
    .insert({
      skill_id: skillId,
      team_id: teamId,
      status: 'running',
      input: { type: 'calendar', year },
    })
    .select('id')
    .single()

  const executionId = (execRow as { id: string } | null)?.id

  try {
    // 7. Generate calendar
    const calendar = await generateCalendar({
      brandDna,
      products,
      currentDate: new Date(),
      year,
    })

    const durationMs = Date.now() - startedAt

    // 8. Update execution record
    if (executionId) {
      await serviceClient
        .from('skill_executions')
        .update({
          status: 'completed',
          output: calendar,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId)
    }

    // 9. Return result
    return NextResponse.json({ executionId, calendar, durationMs })
  } catch (error) {
    const safeMessage = safeError('generate-calendar', error, 'Calendar generation failed')

    if (executionId) {
      await serviceClient
        .from('skill_executions')
        .update({
          status: 'failed',
          error_message: safeMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId)
    }

    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}
