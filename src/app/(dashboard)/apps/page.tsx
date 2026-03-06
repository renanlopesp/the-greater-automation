import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { getAppConnections } from '@/lib/composio/actions/get-app-connections'
import { getComposioApps } from '@/lib/composio/actions/get-composio-apps'
import AppsClient from '@/components/apps/apps-client'

export default async function AppsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/dashboard')

  const [connections, catalog] = await Promise.all([getAppConnections(), getComposioApps()])

  const connectedIds = new Set(connections.map((c) => c.app_id))

  const apps = catalog.map((app) => ({
    id: app.id,
    name: app.name,
    logoUrl: app.logoUrl,
    category: app.category,
    isConnected: connectedIds.has(app.id),
  }))

  // Sort: connected first, then alphabetical
  apps.sort((a, b) => {
    if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return <AppsClient apps={apps} />
}
