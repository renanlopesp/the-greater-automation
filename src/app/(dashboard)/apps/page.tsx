import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getComposioApps } from '@/lib/composio/actions/get-composio-apps'
import { getAppConnections } from '@/lib/composio/actions/get-app-connections'
import AppsClient from '@/components/apps/apps-client'
import type { AppIntegration } from '@/data/apps'

export default async function AppsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [composioApps, connections, { data: teamMember }] = await Promise.all([
    getComposioApps(),
    getAppConnections(),
    supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).single(),
  ])

  const connectedAppIds = new Set(connections.map((c) => c.app_id))

  const apps: AppIntegration[] = composioApps.map((app) => ({
    id: app.id,
    name: app.name,
    emoji: '',
    logoUrl: app.logoUrl || undefined,
    category: app.category,
    description: '',
    connected: connectedAppIds.has(app.id),
    authType: app.authType,
    isNative: app.id === 'nuvemshop',
  }))

  return <AppsClient apps={apps} teamId={teamMember?.team_id ?? null} />
}
