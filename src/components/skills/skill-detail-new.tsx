import SkillDetailHeader from '@/components/skills/skill-detail-header'
import SkillAboutSection from '@/components/skills/skill-about-section'
import SkillStatsBar from '@/components/skills/skill-stats-bar'
import SkillActionsList from '@/components/skills/skill-actions-list'
import SkillExpectedResults from '@/components/skills/skill-expected-results'
import SkillConfigPanel from '@/components/skills/skill-config-panel'
import SkillConnectionsSection from '@/components/skills/skill-connections-section'
import SkillOutputsSection from '@/components/skills/skill-outputs-section'

interface StatItem {
  value: string
  label: string
}

interface ActionItem {
  action: string
  frequency: string
}

interface ConnectionItem {
  emoji: string
  name: string
  connected: boolean
}

interface ConnectedSkillItem {
  name: string
  reason: string
  active: boolean
}

interface OutputItem {
  title: string
  description: string
  href?: string
}

interface SkillDetailNewProps {
  teamId: string
  slug: string
  name: string
  description: string
  aboutText: string
  emoji: string
  colorBg: string
  isActive: boolean
  stats: StatItem[]
  actions: ActionItem[]
  expectedResults: string[]
  showConfig?: boolean
  defaultAutonomy?: 'approval' | 'automatic'
  defaultBriefingAdvance?: string
  connections: ConnectionItem[]
  connectedSkills: ConnectedSkillItem[]
  outputs: OutputItem[]
}

export default function SkillDetailNew({
  teamId,
  slug,
  name,
  description,
  aboutText,
  emoji,
  colorBg,
  isActive,
  stats,
  actions,
  expectedResults,
  showConfig = false,
  defaultAutonomy,
  defaultBriefingAdvance,
  connections,
  connectedSkills,
  outputs,
}: SkillDetailNewProps) {
  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-[800px] flex-col gap-8 px-6 py-8">
        <SkillDetailHeader
          teamId={teamId}
          slug={slug}
          name={name}
          description={description}
          emoji={emoji}
          colorBg={colorBg}
          isActive={isActive}
        />

        <SkillAboutSection description={aboutText} />

        {stats.length > 0 && <SkillStatsBar stats={stats} />}

        {actions.length > 0 && <SkillActionsList actions={actions} />}

        {expectedResults.length > 0 && <SkillExpectedResults results={expectedResults} />}

        {showConfig && (
          <SkillConfigPanel
            defaultAutonomy={defaultAutonomy}
            defaultBriefingAdvance={defaultBriefingAdvance}
          />
        )}

        <SkillConnectionsSection connections={connections} connectedSkills={connectedSkills} />

        {outputs.length > 0 && <SkillOutputsSection outputs={outputs} />}
      </div>
    </div>
  )
}
