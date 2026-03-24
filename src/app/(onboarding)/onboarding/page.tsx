import { redirect } from 'next/navigation'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { WelcomeScreen } from '@/components/onboarding/welcome-screen'

export default async function OnboardingPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

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
