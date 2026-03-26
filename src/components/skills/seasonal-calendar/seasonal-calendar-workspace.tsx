'use client'

import { SkillWorkspace } from '@/components/skill-workspace/skill-workspace'
import { CalendarHeroCard } from './calendar-hero-card'
import CalendarArtifact from './calendar-artifact'

const QUICK_ACTIONS = [
  { label: 'Qual a próxima data importante?', message: 'Qual a próxima data importante?' },
  { label: 'Gerar briefing de Dia das Mães', message: 'Gerar briefing de Dia das Mães' },
  { label: 'Mostrar calendário', message: 'Mostrar calendário' },
]

export function SeasonalCalendarWorkspace() {
  return (
    <SkillWorkspace
      skill={{ name: 'Seasonal Calendar', emoji: '📅', status: 'active' }}
      heroCard={<CalendarHeroCard />}
      quickActions={QUICK_ACTIONS}
      artifactContent={<CalendarArtifact />}
      inputPlaceholder="Pergunte sobre datas sazonais..."
    />
  )
}
