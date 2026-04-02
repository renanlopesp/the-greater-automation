import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { regenerateSection } from '@/lib/ai/seasonal-campaign-generator'
import type { FullCampaign, DeliverableSectionType } from '@/data/campaign-data'
import { safeError } from '@/lib/safe-error'

const VALID_SECTIONS: DeliverableSectionType[] = ['copies', 'email', 'assets', 'video', 'timeline']

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
  const { taskId, dateId, sectionType } = body as {
    taskId?: string
    dateId?: string
    sectionType?: string
  }
  if (!taskId || !dateId || !sectionType) {
    return NextResponse.json(
      { error: 'taskId, dateId, and sectionType are required' },
      { status: 400 }
    )
  }
  if (!VALID_SECTIONS.includes(sectionType as DeliverableSectionType)) {
    return NextResponse.json(
      { error: `Invalid sectionType. Valid: ${VALID_SECTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  // 3. Load task artifact_data to get campaign
  const { data: taskRow } = await serviceClient
    .from('tasks')
    .select('artifact_data')
    .eq('id', taskId)
    .single()

  if (!taskRow?.artifact_data) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const artifact = taskRow.artifact_data as {
    campaigns?: Record<string, FullCampaign>
    [key: string]: unknown
  }
  const campaign = artifact.campaigns?.[dateId]
  if (!campaign) {
    return NextResponse.json({ error: `Campaign not found for date ${dateId}` }, { status: 404 })
  }

  // 4. Fetch brand_dna for section generation
  const { data: brandDna } = await serviceClient
    .from('brand_dna')
    .select('niche, tone, audience, positioning, words_to_use, words_to_avoid, average_ticket')
    .eq('team_id', teamId)
    .single()

  if (!brandDna) {
    return NextResponse.json(
      { error: 'Brand DNA not found. Complete brand analysis first.' },
      { status: 400 }
    )
  }

  try {
    // 5. Generate the specific section
    const products = campaign.curatedProducts ?? campaign.selectedProducts
    let result: Partial<FullCampaign> = {}

    if (sectionType === 'email') {
      // Use dedicated email template generator for branded HTML
      const { generateEmailTemplate } = await import('@/lib/ai/email-template-generator')
      const emailResult = await generateEmailTemplate({
        campaignSlogan: campaign.concept.slogan,
        campaignIntro: campaign.intro,
        dateName: campaign.concept.description,
        products,
        brandDna: brandDna as {
          niche: string
          tone: string
          audience: string
          positioning: string
        },
      })
      result = {
        emailSubject: emailResult.subject,
        emailPreview: emailResult.preview,
      }
      // Store HTML in deliverables.email.data
      campaign.deliverables = campaign.deliverables ?? {
        copies: { status: 'not_generated' as const },
        email: { status: 'not_generated' as const },
        assets: { status: 'not_generated' as const },
        video: { status: 'not_generated' as const },
        timeline: { status: 'not_generated' as const },
      }
      campaign.deliverables.email = {
        status: 'generated',
        generated_at: new Date().toISOString(),
        data: {
          subject: emailResult.subject,
          preview: emailResult.preview,
          html: emailResult.html,
        },
      }
    } else if (sectionType === 'assets') {
      // Use dedicated asset generator for AI images
      const { generateAssets } = await import('@/lib/ai/asset-generator')
      const assets = await generateAssets({
        campaignSlogan: campaign.concept.slogan,
        dateName: campaign.concept.description,
        products,
        brandDna: brandDna as {
          niche: string
          tone: string
          positioning: string
        },
      })
      result = {
        assets: assets.map((a) => ({
          label: a.label,
          ratio: a.ratio,
          bg: '',
          html: a.html,
          width: a.width,
          height: a.height,
        })),
      }
    } else {
      // Use existing regenerateSection for copies, video, timeline
      const regenType = sectionType as 'copies' | 'video' | 'timeline' | 'products'
      result = await regenerateSection({
        sectionType: regenType,
        existingCampaign: campaign,
        brandDna: brandDna as {
          niche: string
          tone: string
          audience: string
          positioning: string
          words_to_use: string[]
          words_to_avoid: string[]
        },
      })
    }

    // 6. Update campaign with generated section + deliverable status
    const updatedCampaign = { ...campaign, ...result }

    // Update deliverable status
    const prevDeliverables = updatedCampaign.deliverables ?? {
      copies: { status: 'not_generated' as const },
      email: { status: 'not_generated' as const },
      assets: { status: 'not_generated' as const },
      video: { status: 'not_generated' as const },
      timeline: { status: 'not_generated' as const },
    }
    const generatedMeta = { status: 'generated' as const, generated_at: new Date().toISOString() }
    updatedCampaign.deliverables = {
      copies:
        sectionType === 'copies'
          ? { ...prevDeliverables.copies, ...generatedMeta }
          : prevDeliverables.copies,
      email:
        sectionType === 'email'
          ? { ...prevDeliverables.email, ...generatedMeta }
          : prevDeliverables.email,
      assets:
        sectionType === 'assets'
          ? { ...prevDeliverables.assets, ...generatedMeta }
          : prevDeliverables.assets,
      video:
        sectionType === 'video'
          ? { ...prevDeliverables.video, ...generatedMeta }
          : prevDeliverables.video,
      timeline:
        sectionType === 'timeline'
          ? { ...prevDeliverables.timeline, ...generatedMeta }
          : prevDeliverables.timeline,
    }

    // 7. Save back to artifact_data
    const updatedArtifact = {
      ...artifact,
      campaigns: { ...artifact.campaigns, [dateId]: updatedCampaign },
    }

    await serviceClient
      .from('tasks')
      .update({ artifact_data: updatedArtifact, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    return NextResponse.json({ success: true, sectionType, result })
  } catch (error) {
    const safeMessage = safeError('generate-deliverable', error, 'Deliverable generation failed')
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}
