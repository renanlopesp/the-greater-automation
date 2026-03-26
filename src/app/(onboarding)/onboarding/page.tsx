import { redirect } from 'next/navigation'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { WelcomeScreen } from '@/components/onboarding/welcome-screen'

export default async function OnboardingPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    let { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    // If user has no team (trigger may have failed), create one
    if (!membership) {
      const serviceClient = createServiceRoleClient()
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      const slug = userName.toLowerCase().replace(/\s+/g, '-') + '-' + user.id.substring(0, 8)

      const { data: newTeam } = await serviceClient
        .from('teams')
        .insert({ name: `${userName}'s Team`, slug })
        .select('id')
        .single()

      if (newTeam) {
        await serviceClient
          .from('team_members')
          .insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' })

        membership = { team_id: newTeam.id }
      }
    }

    if (membership) {
      const serviceClient = createServiceRoleClient()
      const { data: store } = await (
        serviceClient as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (
                k: string,
                v: string
              ) => {
                single: () => Promise<{ data: { onboarding_completed: boolean } | null }>
              }
            }
          }
        }
      )
        .from('stores')
        .select('onboarding_completed')
        .eq('team_id', membership.team_id)
        .single()

      if (store?.onboarding_completed === true) {
        redirect('/')
      }
    }
  }

  return <WelcomeScreen />
}
