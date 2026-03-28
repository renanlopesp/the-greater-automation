'use server'

import { activateSkill } from '@/lib/actions/skills'

export async function completeOnboarding(selectedSkillSlugs: string[]) {
  for (const slug of selectedSkillSlugs) {
    await activateSkill(slug)
  }
  // Future: mark onboarding as complete in user/team settings
}
