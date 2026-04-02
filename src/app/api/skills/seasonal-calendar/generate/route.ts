import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { generateCampaign } from '@/lib/ai/seasonal-campaign-generator'
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
  const { dateId, dateName, dateEmoji, dateDisplayDate } = body as {
    dateId?: string
    dateName?: string
    dateEmoji?: string
    dateDisplayDate?: string
  }
  if (!dateId || !dateName) {
    return NextResponse.json({ error: 'dateId and dateName are required' }, { status: 400 })
  }

  // 3. Fetch brand_dna, store, and skill_id in parallel
  const [brandDnaResult, storeResult, skillId] = await Promise.all([
    serviceClient
      .from('brand_dna')
      .select(
        'id, team_id, niche, tone, audience, positioning, words_to_use, words_to_avoid, average_ticket'
      )
      .eq('team_id', teamId)
      .limit(1)
      .single(),
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
    tone: string
    audience: string
    positioning: string
    words_to_use: string[]
    words_to_avoid: string[]
    average_ticket: number
  }

  // 4. Fetch store products (depends on store query)
  let products: Array<{
    name: string
    price: number
    image_url?: string
    category?: string
    cost_price?: number
    stock_quantity?: number
  }> = []
  if (storeResult.data) {
    const { data: storeProducts } = await serviceClient
      .from('store_products')
      .select('name, price, images, category, cost_price, stock_quantity')
      .eq('store_id', (storeResult.data as { id: string }).id)
      .eq('is_published', true)
      .limit(50)
    products = (
      (storeProducts ?? []) as Array<{
        name: string
        price: number
        images?: Array<{ src: string }> | null
        category?: string
        cost_price?: number
        stock_quantity?: number
      }>
    ).map((p) => ({
      name: p.name,
      price: p.price,
      image_url: p.images?.[0]?.src ?? undefined,
      category: p.category,
      cost_price: p.cost_price,
      stock_quantity: p.stock_quantity,
    }))
  }

  // 6. Insert skill_executions record with status='running'
  const startedAt = Date.now()
  const { data: execRow } = await serviceClient
    .from('skill_executions')
    .insert({
      skill_id: skillId,
      team_id: teamId,
      status: 'running',
      input: { type: 'campaign', dateId, dateName },
    })
    .select('id')
    .single()

  const executionId = (execRow as { id: string } | null)?.id

  try {
    // 7. Generate campaign
    const campaign = await generateCampaign({
      date: {
        id: dateId,
        name: dateName,
        emoji: dateEmoji ?? '📅',
        displayDate: dateDisplayDate ?? dateName,
      },
      brandDna,
      products,
    })

    const durationMs = Date.now() - startedAt

    // 8. Update execution record
    if (executionId) {
      await serviceClient
        .from('skill_executions')
        .update({
          status: 'completed',
          output: campaign,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId)
    }

    // 9. Return result
    return NextResponse.json({ executionId, campaign, durationMs })
  } catch (error) {
    const safeMessage = safeError('generate-campaign', error, 'Campaign generation failed')

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
