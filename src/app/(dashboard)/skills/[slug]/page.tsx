import SkillDetailNew from '@/components/skills/skill-detail-new'
import { SeasonalCalendarWorkspace } from '@/components/skills/seasonal-calendar/seasonal-calendar-workspace'
import { skills as skillRegistry } from '@/data/skills'

interface SkillDetailPageProps {
  params: Promise<{ slug: string }>
}

// ── Generic mock for non-workspace skills ────────────────────────────────────
function getGenericMock(skillName: string, skillDescription: string) {
  return {
    aboutText: `${skillName} é uma skill que ajuda sua loja a maximizar resultados com automação inteligente. ${skillDescription}`,
    stats: [
      { value: '24/7', label: 'monitoring' },
      { value: 'auto', label: 'execution' },
      { value: 'hoje', label: 'first result' },
    ],
    actions: [
      { action: 'Analisa dados da loja continuamente', frequency: 'Contínuo' },
      { action: 'Identifica oportunidades de ação', frequency: 'Automático' },
      { action: 'Executa ou notifica com antecedência', frequency: 'Configurável' },
    ],
    expectedResults: [
      'Ações automatizadas sem intervenção manual',
      'Alertas no momento certo, antes que seja tarde',
      'Resultados rastreados e documentados',
    ],
    connections: [{ emoji: '🛍', name: 'Shopify', connected: true }],
    connectedSkills: [
      { name: 'Task Prioritizer', reason: 'Receives daily summaries', active: true },
    ],
    outputs: [] as { title: string; description: string; href?: string }[],
  }
}

export default async function SkillDetailPage({ params }: SkillDetailPageProps) {
  const { slug } = await params

  // Seasonal Calendar has its own workspace — render instantly
  if (slug === 'seasonal-calendar') {
    return <SeasonalCalendarWorkspace />
  }

  // For other skills, use static registry data (no server queries)
  const registrySkill = skillRegistry.find((s) => s.slug === slug)

  if (!registrySkill) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Skill não encontrada.</p>
      </div>
    )
  }

  const mock = getGenericMock(registrySkill.name, registrySkill.description)

  return (
    <SkillDetailNew
      teamId=""
      slug={slug}
      name={registrySkill.name}
      description={registrySkill.description}
      aboutText={mock.aboutText}
      emoji={registrySkill.emoji ?? '✨'}
      colorBg={registrySkill.color ? `${registrySkill.color}20` : '#64748b20'}
      isActive={false}
      stats={mock.stats}
      actions={mock.actions}
      expectedResults={mock.expectedResults}
      showConfig={false}
      defaultAutonomy="approval"
      defaultBriefingAdvance="D-60"
      connections={mock.connections}
      connectedSkills={mock.connectedSkills}
      outputs={mock.outputs}
    />
  )
}
