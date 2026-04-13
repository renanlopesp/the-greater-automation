import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { loadStoreContext } from '@/lib/snew-home/load-store-context'
import { HeroPrompt } from '@/components/snew-home/hero-prompt'
import { FeatureCards } from '@/components/snew-home/feature-cards'
import { TemplatesSection } from '@/components/snew-home/templates-section'
import { CapabilitiesSection } from '@/components/snew-home/capabilities-section'
import { RecentsEmpty } from '@/components/snew-home/recents-empty'
import { SvgFilters } from '@/components/snew-layout/svg-filters'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let storeCtx = null
  if (user) {
    const teamId = await getActiveTeamId(supabase, user.id)
    if (teamId) {
      storeCtx = await loadStoreContext(supabase, teamId)
    }
  }

  const storeName = storeCtx?.name ?? undefined
  const niche = storeCtx?.niche ?? null
  const tone = storeCtx?.tone ?? null
  const firstProduct = storeCtx?.productTypes?.[0] ?? undefined

  return (
    <div className="min-h-full" style={{ background: 'hsl(40, 7%, 96%)' }}>
      <SvgFilters />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 40px 80px' }}>
        <HeroPrompt storeName={storeName} />
        <FeatureCards storeName={storeName} niche={niche} tone={tone} firstProduct={firstProduct} />
        <div style={{ marginTop: 40 }}>
          <TemplatesSection />
          <CapabilitiesSection storeCtx={storeCtx} />
          <RecentsEmpty />
        </div>
      </div>
    </div>
  )
}
