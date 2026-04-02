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
    serviceClient
      .from('stores')
      .select('id, platform, platform_store_id, platform_access_token')
      .eq('team_id', teamId)
      .limit(1)
      .single(),
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
    const storeData = storeResult.data as {
      id: string
      platform?: string
      platform_store_id?: string
      platform_access_token?: string
    }
    if (
      storeData.platform === 'nuvemshop' &&
      storeData.platform_store_id &&
      storeData.platform_access_token
    ) {
      const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
      const client = new NuvemshopClient(
        storeData.platform_store_id,
        storeData.platform_access_token
      )
      const liveProducts = await client.getProducts(1, 200)
      products = liveProducts.map((p) => ({
        name:
          typeof p.name === 'object'
            ? ((p.name as Record<string, string>).pt ??
              Object.values(p.name as Record<string, string>)[0] ??
              '')
            : String(p.name),
        price: p.variants?.[0]?.price ? Number(p.variants[0].price) : 0,
        image_url: p.images?.[0]?.src ?? undefined,
      }))
    } else {
      const { data: storeProducts } = await serviceClient
        .from('store_products')
        .select('name, price, images, category, cost_price, stock_quantity')
        .eq('store_id', storeData.id)
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

    // Inject image_url from original products (AI doesn't reliably copy URLs)
    const productImageMap = new Map(products.map((p) => [p.name.toLowerCase(), p.image_url]))
    for (const p of campaign.concept.products) {
      if (!p.image_url) {
        p.image_url = productImageMap.get(p.name.toLowerCase()) ?? undefined
      }
    }
    for (const p of campaign.selectedProducts) {
      if (!p.image_url) {
        ;(p as { image_url?: string | null }).image_url =
          productImageMap.get(p.name.toLowerCase()) ?? undefined
      }
    }

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
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[generate-campaign] Error:', errMsg, error)
    const safeMessage = safeError(
      'generate-campaign',
      error,
      `Campaign generation failed: ${errMsg}`
    )

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
