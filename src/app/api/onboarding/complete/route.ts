import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { activateSkill } from '@/lib/actions/skills'

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

  const body = await request.json()
  const { selectedSkillSlugs } = body as { selectedSkillSlugs: string[] }

  // Activate each selected skill
  for (const slug of selectedSkillSlugs) {
    try {
      await activateSkill(membership.team_id, slug)
    } catch (e) {
      console.error(`Failed to activate skill ${slug}:`, e)
    }
  }

  // Mark onboarding as complete
  const serviceClient = createServiceRoleClient()
  await serviceClient
    .from('stores')
    .update({ onboarding_completed: true })
    .eq('team_id', membership.team_id)

  return NextResponse.json({ success: true, activatedSkills: selectedSkillSlugs.length })
}
