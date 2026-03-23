'use server'

import { activateSkill } from '@/lib/actions/skills'

export async function completeOnboarding(teamId: string, selectedSkillSlugs: string[]) {
  for (const slug of selectedSkillSlugs) {
    await activateSkill(teamId, slug)
  }
  // Future: mark onboarding as complete in user/team settings
}
