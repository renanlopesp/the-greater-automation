import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { generateCampaign, regenerateSection } from '@/lib/ai/seasonal-campaign-generator'
import type { FullCampaign } from '@/data/campaign-data'

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
  const { dateId, sectionType } = body as { dateId?: string; sectionType?: string }
  if (!dateId || !sectionType) {
    return NextResponse.json({ error: 'dateId and sectionType are required' }, { status: 400 })
  }

  // 3. Load existing campaign from skill_executions
  const { data: rows } = await serviceClient
    .from('skill_executions')
    .select('id, output')
    .eq('team_id', teamId)
    .eq('status', 'completed')
    .filter('input->>type', 'eq', 'campaign')
    .filter('input->>dateId', 'eq', dateId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!rows || (rows as unknown[]).length === 0) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const existingRow = (rows as Array<{ id: string; output: unknown }>)[0]
  const existingCampaign = existingRow.output as FullCampaign
  const executionId = existingRow.id

  // 4. Fetch brand_dna
  const { data: brandDnaRow } = await serviceClient
    .from('brand_dna')
    .select('*')
    .eq('team_id', teamId)
    .limit(1)
    .single()

  if (!brandDnaRow) {
    return NextResponse.json(
      { error: 'Brand DNA not found. Complete brand analysis first.' },
      { status: 400 }
    )
  }

  const brandDna = brandDnaRow as {
    niche: string
    tone: string
    audience: string
    positioning: string
    words_to_use: string[]
    words_to_avoid: string[]
    average_ticket: number
  }

  try {
    let updatedCampaign: FullCampaign

    // 5. Regenerate: full regen for 'concept', section-only otherwise
    if (sectionType === 'concept') {
      const fresh = await generateCampaign({
        date: {
          id: dateId,
          name: existingCampaign.concept.slogan,
          emoji: '📅',
          displayDate: dateId,
        },
        brandDna,
        products: [],
      })
      updatedCampaign = { ...existingCampaign, ...fresh }
    } else {
      const partial = await regenerateSection({
        sectionType: sectionType as Parameters<typeof regenerateSection>[0]['sectionType'],
        existingCampaign,
        brandDna,
      })
      updatedCampaign = { ...existingCampaign, ...partial }
    }

    // 6. Update execution record with merged output
    await serviceClient
      .from('skill_executions')
      .update({
        output: updatedCampaign,
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)

    // 7. Return updated campaign
    return NextResponse.json({ executionId, campaign: updatedCampaign })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Regeneration failed'
    console.error('[regenerate-section] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
