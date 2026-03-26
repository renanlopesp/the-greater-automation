import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { fetchSkillBySlug } from '@/lib/queries/skills'
import SkillDetailNew from '@/components/skills/skill-detail-new'
import { SeasonalCalendarWorkspace } from '@/components/skills/seasonal-calendar/seasonal-calendar-workspace'
import { skills as skillRegistry } from '@/data/skills'

interface SkillDetailPageProps {
  params: Promise<{ slug: string }>
}

// ── Mock content for seasonal-calendar ────────────────────────────────────────
const SEASONAL_CALENDAR_MOCK = {
  aboutText:
    'Sua loja tem datas que vendem 5x mais que um dia normal — e a maioria dos lojistas só lembra delas quando já é tarde. O Seasonal Calendar analisa seu catálogo, infere o nicho da loja, cruza com seu histórico de vendas e monta um calendário completo com datas gerais e de nicho, ranqueadas por potencial real de receita. Com 60 dias de antecedência, entrega um briefing pronto com produtos, canais e público sugeridos — e pode acionar automaticamente a skill de campanha.',
  stats: [
    { value: '30+', label: 'dates mapped' },
    { value: 'D-60', label: 'advance briefing' },
    { value: 'auto', label: 'campaign trigger' },
  ],
  actions: [
    { action: 'Analisa catálogo e infere nicho automaticamente', frequency: 'Setup' },
    { action: 'Gera calendário com datas gerais + nicho priorizadas', frequency: 'Anual' },
    { action: 'Entrega briefing com produtos, canais e público', frequency: 'D-60' },
    { action: 'Aciona Campaign Engine para gerar campanha', frequency: 'Configurável' },
    {
      action: 'Alerta quando data com potencial alto está sem ação',
      frequency: 'D-45 / D-30 / D-15',
    },
    { action: 'Gera resumo diário e relatório semanal com tendências', frequency: 'Contínuo' },
  ],
  expectedResults: [
    'Zero datas sazonais perdidas por falta de planejamento',
    'Campanhas preparadas com 60 dias de antecedência',
    'Receita sazonal capturada acima do ano anterior',
    'Alertas progressivos impedem oportunidades desperdiçadas',
  ],
  connections: [{ emoji: '🛍', name: 'Shopify', connected: true }],
  connectedSkills: [
    {
      name: 'Campaign Engine',
      reason: 'Receives briefing at D-60 to generate campaign',
      active: true,
    },
    { name: 'Task Prioritizer', reason: 'Receives daily calendar summary', active: true },
    { name: 'Weekly Briefing', reason: 'Receives weekly seasonal report', active: false },
  ],
  outputs: [
    {
      title: 'Full Year Calendar',
      description: 'Visualize todas as datas mapeadas para 2026',
      href: '/skills/seasonal-calendar/calendar',
    },
    {
      title: 'Briefing — Dia das Mães 2026',
      description: '47 dias restantes · Potencial: R$ 45.000',
      href: '/skills/seasonal-calendar/briefing/dia-das-maes',
    },
    {
      title: 'Campaign Timeline',
      description: 'Campanha gerada para Dia das Mães 2026',
      href: '/skills/seasonal-calendar/campaign/dia-das-maes',
    },
    {
      title: 'Weekly Report',
      description: 'Relatório da semana de 17–23 Mar 2026',
      href: '/skills/seasonal-calendar/reports/weekly',
    },
  ],
}

// ── Generic mock for other slugs ───────────────────────────────────────────────
function getGenericMock(skillName: string, skillDescription: string) {
  return {
    aboutText: `${skillName} é uma skill que ajuda sua loja a maximizar resultados com automação inteligente. Ela se integra ao orquestrador e executa ações no momento certo, com base nos seus dados. ${skillDescription}`,
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
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const teamId = await getActiveTeamId(supabase, user.id)

  if (!teamId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">
          Nenhuma equipe encontrada. Entre em contato com o suporte.
        </p>
      </div>
    )
  }

  // Try to fetch from DB; fall back to registry definition for display
  const dbSkill = await fetchSkillBySlug(supabase, teamId, slug)

  // Find registry entry for metadata (emoji, color, etc.)
  const registrySkill = skillRegistry.find((s) => s.slug === slug)

  if (!dbSkill && !registrySkill) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Skill not found.</p>
      </div>
    )
  }

  const name = dbSkill?.name ?? registrySkill?.name ?? slug
  const description = dbSkill?.description ?? registrySkill?.description ?? ''
  const emoji = registrySkill?.emoji ?? '✨'
  const colorBg = registrySkill?.color ? `${registrySkill.color}20` : '#64748b20'
  const isActive = dbSkill?.status === 'active'

  if (slug === 'seasonal-calendar') {
    return <SeasonalCalendarWorkspace />
  }

  const mock = getGenericMock(name, description)

  return (
    <SkillDetailNew
      teamId={teamId}
      slug={slug}
      name={name}
      description={description}
      aboutText={mock.aboutText}
      emoji={emoji}
      colorBg={colorBg}
      isActive={isActive}
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
