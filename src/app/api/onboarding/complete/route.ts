import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { seedSeasonalCalendar } from '@/lib/actions/skills'

const OnboardingCompleteSchema = z.object({
  selectedSkillSlugs: z.array(z.string().min(1)).min(0),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) return NextResponse.json({ error: 'No team' }, { status: 400 })

  const rawBody = await request.json().catch(() => null)
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = OnboardingCompleteSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: Object.keys(parsed.error.flatten().fieldErrors) },
      { status: 400 }
    )
  }
  const { selectedSkillSlugs } = parsed.data

  const serviceClient = createServiceRoleClient()

  // Activate each selected skill via RPC (bypasses schema cache)
  for (const slug of selectedSkillSlugs) {
    try {
      await (
        serviceClient as unknown as {
          rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: unknown }>
        }
      ).rpc('activate_skill', {
        p_team_id: membership.team_id,
        p_slug: slug,
      })
    } catch (e) {
      console.error(`Failed to activate skill ${slug}:`, e)
    }
  }

  // Mark onboarding as complete
  await serviceClient
    .from('stores')
    .update({ onboarding_completed: true } as never)
    .eq('team_id', membership.team_id)

  // Seed the Seasonal Calendar as the first real skill
  try {
    await seedSeasonalCalendar()
  } catch (e) {
    console.error('Failed to seed Seasonal Calendar:', e)
  }

  return NextResponse.json({ success: true, activatedSkills: selectedSkillSlugs.length })
}
