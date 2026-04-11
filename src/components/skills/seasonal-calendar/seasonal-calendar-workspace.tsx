'use client'

import { SkillWorkspace } from '@/components/skill-workspace/skill-workspace'
import { CalendarHeroCard } from './calendar-hero-card'
import CalendarArtifact from './calendar-artifact'
import { useSeasonalCalendar } from '@/hooks/use-seasonal-calendar'

const QUICK_ACTIONS = [
  { label: 'Qual a próxima data importante?', message: 'Qual a próxima data importante?' },
  { label: 'Gerar briefing de Dia das Mães', message: 'Gerar briefing de Dia das Mães' },
  { label: 'Mostrar calendário', message: 'Mostrar calendário' },
]

export function SeasonalCalendarWorkspace() {
  const {
    calendar,
    campaigns,
    isLoadingCalendar,
    generateCalendar,
    generateCampaign,
    regenerateSection,
    isGeneratingCalendar,
    isGeneratingCampaign,
    isRegenerating,
  } = useSeasonalCalendar()

  return (
    <SkillWorkspace
      skill={{ name: 'Seasonal Calendar', emoji: '📅', status: 'active' }}
      heroCard={
        <CalendarHeroCard
          calendar={calendar}
          onRegenerateCalendar={() => generateCalendar.mutate(undefined)}
          isRegeneratingCalendar={isGeneratingCalendar}
        />
      }
      quickActions={QUICK_ACTIONS}
      artifactContent={
        <CalendarArtifact
          calendar={calendar}
          campaigns={campaigns ?? {}}
          isLoadingCalendar={isLoadingCalendar}
          generateCalendar={generateCalendar}
          generateCampaign={generateCampaign}
          regenerateSection={regenerateSection}
          isGeneratingCalendar={isGeneratingCalendar}
          isGeneratingCampaign={isGeneratingCampaign}
          isRegenerating={isRegenerating}
        />
      }
      inputPlaceholder="Pergunte sobre datas sazonais..."
      chatMessages={[]}
      chatIsLoading={false}
      chatIsStreaming={false}
      onChatSendMessage={() => {}}
      onChatStop={() => {}}
    />
  )
}
