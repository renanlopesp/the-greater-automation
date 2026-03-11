import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { apps as staticApps } from '@/data/apps'
import AppsClient from '@/components/apps/apps-client'

export default async function AppsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: connections } = await supabase
    .from('app_connections')
    .select('id, app_id, account_label')
    .eq('user_id', user.id)

  const connectedAppIds = new Set((connections ?? []).map((c) => c.app_id))

  const mergedApps = staticApps.map((app) => ({
    ...app,
    connected: connectedAppIds.has(app.id),
  }))

  return <AppsClient apps={mergedApps} />
}
