import { HeroPrompt } from '@/components/snew-home/hero-prompt'
import { FeatureCards } from '@/components/snew-home/feature-cards'
import { TemplatesSection } from '@/components/snew-home/templates-section'
import { CapabilitiesSection } from '@/components/snew-home/capabilities-section'
import { RecentsEmpty } from '@/components/snew-home/recents-empty'
import { SvgFilters } from '@/components/snew-layout/svg-filters'

export default function DashboardPage() {
  return (
    <div className="min-h-full" style={{ background: 'hsl(40, 7%, 96%)' }}>
      <SvgFilters />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 40px 80px' }}>
        <HeroPrompt />
        <FeatureCards />
        <div style={{ marginTop: 40 }}>
          <TemplatesSection />
          <CapabilitiesSection />
          <RecentsEmpty />
        </div>
      </div>
    </div>
  )
}
