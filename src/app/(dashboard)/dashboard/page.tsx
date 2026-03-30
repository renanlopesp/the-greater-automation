import HeroRotatingTitle from '@/components/home/hero-rotating-title'
import AskBarNew from '@/components/home/ask-bar-new'
import QuickSuggestions from '@/components/home/quick-suggestions'
import ActivityCards from '@/components/home/activity-cards'
import SkillActionsGrid from '@/components/home/skill-actions-grid'

export default function DashboardPage() {
  return (
    <div className="bg-background min-h-full">
      <div
        className="mx-auto flex flex-col items-center"
        style={{ maxWidth: 880, padding: '64px 32px 48px', gap: 64 }}
      >
        {/* Hero: rotating title + chat input + suggestions */}
        <div className="flex w-full flex-col items-center" style={{ maxWidth: 680, gap: 24 }}>
          <HeroRotatingTitle />
          <AskBarNew />
          <QuickSuggestions />
        </div>

        {/* Divider */}
        <div className="w-full" style={{ height: 1, background: 'var(--border)' }} />

        {/* Activity cards */}
        <ActivityCards />

        {/* Divider */}
        <div className="w-full" style={{ height: 1, background: 'var(--border)' }} />

        {/* Skill actions grid */}
        <SkillActionsGrid />
      </div>
    </div>
  )
}
