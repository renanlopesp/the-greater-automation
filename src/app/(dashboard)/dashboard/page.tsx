import AskBarNew from '@/components/home/ask-bar-new'
import QuickSuggestions from '@/components/home/quick-suggestions'
import ActivityFeed from '@/components/home/activity-feed'
import ActiveSkillsRow from '@/components/home/active-skills-row'

export default function DashboardPage() {
  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-[720px] flex-col gap-12 px-6 py-12">
        <div>
          <AskBarNew />
          <QuickSuggestions />
        </div>
        <ActivityFeed />
        <ActiveSkillsRow />
      </div>
    </div>
  )
}
