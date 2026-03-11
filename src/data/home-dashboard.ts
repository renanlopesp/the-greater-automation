// ── Types ──────────────────────────────────────────────────────────

export interface Metric {
  label: string
  value: string
  sub: string
  pulse?: boolean
}

export interface Scenario {
  label: string
  dateStr: string
  timeStr: string
  heading: string
  metrics: Metric[]
}

export type BadgeColor = 'green' | 'amber' | 'blue' | 'neutral'

export interface AgentCard {
  id: string
  name: string
  emoji: string
  avatarUrl?: string
  badge: { label: string; color: BadgeColor }
  pulse: boolean
  inactive?: boolean
  stat1: string
  stat2: string
  stat3?: string
  summary: string
  kpis: { label: string; value: string; sub?: string }[]
  actions: {
    status: 'done' | 'running' | 'scheduled' | 'pending'
    label: string
    time: string
  }[]
}

export interface Opportunity {
  emoji: string
  avatarUrl?: string
  agent: string
  summary: string
  value: string
  cta: string
}

// ── Greeting Logic ────────────────────────────────────────────────

export function getDynamicGreeting(
  now: Date,
  name?: string,
  language: 'pt-BR' | 'en' = 'pt-BR'
): {
  heading: string
  sub: string
} {
  const h = now.getHours()
  const dow = now.getDay()

  if (language === 'en') {
    const displayName = name ?? 'you'
    if (h >= 6 && h < 12) {
      return {
        heading: `Good morning, ${displayName}. Your agents worked while you slept.`,
        sub: "Here's what happened since you were last here.",
      }
    }
    if (h >= 12 && h < 18) {
      return {
        heading: `Good afternoon, ${displayName}. Your team is at full speed.`,
        sub: "See what's been done and what still needs your attention.",
      }
    }
    if (h >= 18 && h < 24) {
      return {
        heading: 'While you wrap up your day, your agents keep going.',
        sub: "Here's a summary of what happened today.",
      }
    }
    return {
      heading: 'Your agents worked while you slept.',
      sub: "Here's what happened in the last few hours.",
    }
  }

  // Portuguese — detailed contextual greetings
  const displayName = name ?? 'você'

  if (h >= 6 && h < 12) {
    if (dow === 1)
      return {
        heading: 'Nova semana. Seus agentes já estão trabalhando.',
        sub: 'Aqui está o que aconteceu desde a última vez que você esteve aqui.',
      }
    if (dow >= 2 && dow <= 4)
      return {
        heading: `Bom dia, ${displayName}. 3 coisas aconteceram enquanto você dormia.`,
        sub: 'Seus agentes monitoraram sua loja durante a noite.',
      }
    if (dow === 5)
      return {
        heading: 'Última sexta do mês. Vamos fechar bem.',
        sub: 'Aqui estão as oportunidades que seus agentes identificaram.',
      }
    if (dow === 6)
      return {
        heading: 'Fim de semana é quando sua loja mais vende. Tudo monitorado.',
        sub: 'Sábado de manhã — seus agentes estão acompanhando cada pedido.',
      }
    if (dow === 0)
      return {
        heading: 'Domingo de manhã. 37% dos seus pedidos chegam hoje.',
        sub: 'Seus agentes estão de prontidão para o pico do domingo.',
      }
  }

  if (h >= 12 && h < 18) {
    if (dow === 1)
      return {
        heading: 'Semana começando. Aqui está onde focar agora.',
        sub: 'Seus agentes organizaram as prioridades da semana para você.',
      }
    if (dow >= 2 && dow <= 4)
      return {
        heading: `Boa tarde, ${displayName}. Seus agentes não pararam.`,
        sub: 'Veja o que foi feito e o que ainda precisa da sua atenção.',
      }
    if (dow === 5)
      return {
        heading: 'Sexta à tarde — melhor momento para campanha de fim de semana.',
        sub: 'Seus agentes identificaram oportunidades para aproveitar o fim de semana.',
      }
    if (dow === 6 || dow === 0)
      return {
        heading: 'Fim de semana em andamento. Sua loja está operando no pico.',
        sub: 'Tudo está sendo monitorado em tempo real pelos seus agentes.',
      }
  }

  if (h >= 18 && h < 24) {
    if (dow >= 1 && dow <= 4)
      return {
        heading: 'Enquanto você encerra o dia, seus agentes continuam.',
        sub: 'Aqui está o resumo do que aconteceu hoje.',
      }
    if (dow === 5)
      return {
        heading: 'Fim de semana começa agora — e sua loja também.',
        sub: 'Seus agentes estão prontos para o pico do fim de semana.',
      }
    if (dow === 6)
      return {
        heading: '20h. Pico de compras em 2 horas. Tudo pronto.',
        sub: 'Seus agentes já anteciparam as ações para o pico noturno.',
      }
    if (dow === 0)
      return {
        heading: 'Última chance da semana. Veja o que pode ser aproveitado ainda hoje.',
        sub: 'Seus agentes identificaram oportunidades de última hora.',
      }
  }

  return {
    heading: 'Seus agentes trabalharam enquanto você dormia.',
    sub: 'Aqui está o que aconteceu nas últimas horas e o que precisa da sua atenção.',
  }
}

// ── Default Metrics ───────────────────────────────────────────────

const defaultMetrics: Metric[] = [
  { label: 'Agentes ativos agora', value: '3', sub: 'Live', pulse: true },
  {
    label: 'Recuperado hoje',
    value: 'R$4.200',
    sub: '\u2191 +18% vs. semana passada',
  },
  {
    label: 'Carrinhos salvos',
    value: '12',
    sub: '\u2191 +3 esta manhã',
  },
  {
    label: 'Perguntas resolvidas',
    value: '156',
    sub: '\u2193 2min tempo médio',
  },
  {
    label: 'Horas economizadas',
    value: '~3h',
    sub: 'vs. análise manual',
  },
]

// ── Scenarios ─────────────────────────────────────────────────────

export const scenarios: Scenario[] = [
  {
    label: 'Atual',
    dateStr: '',
    timeStr: '',
    heading: '',
    metrics: defaultMetrics,
  },
  {
    label: 'Segunda, manhã',
    dateStr: 'segunda-feira, 10 de março',
    timeStr: '08:14',
    heading: 'Nova semana. Seus agentes já estão trabalhando.',
    metrics: [
      {
        label: 'Agentes ativos agora',
        value: '4',
        sub: 'Live',
        pulse: true,
      },
      {
        label: 'Tarefas pendentes',
        value: '7',
        sub: 'aguardando sua aprovação',
      },
      {
        label: 'Oportunidades novas',
        value: '3',
        sub: 'identificadas esta manhã',
      },
      {
        label: 'Clientes em risco',
        value: '284',
        sub: 'inativos há 45+ dias',
      },
      { label: 'Meta da semana', value: '0%', sub: 'R$0 de R$28.000' },
    ],
  },
  {
    label: 'Quinta, tarde',
    dateStr: 'quinta-feira, 13 de março',
    timeStr: '14:22',
    heading: 'Boa tarde. Seus agentes não pararam.',
    metrics: [
      {
        label: 'Agentes ativos agora',
        value: '3',
        sub: 'Live',
        pulse: true,
      },
      {
        label: 'Receita do dia',
        value: 'R$7.840',
        sub: '\u2191 +32% vs. quinta passada',
      },
      {
        label: 'Taxa de conversão',
        value: '3,8%',
        sub: '\u2191 +0.6pp esta semana',
      },
      {
        label: 'Ticket médio',
        value: 'R$148',
        sub: '\u2191 +R$12 vs. média',
      },
      {
        label: 'Meta da semana',
        value: '74%',
        sub: 'R$20.600 de R$28.000',
      },
    ],
  },
  {
    label: 'Sábado, noite',
    dateStr: 'sábado, 15 de março',
    timeStr: '20:04',
    heading: '20h. Pico de compras em 2 horas. Tudo pronto.',
    metrics: [
      {
        label: 'Agentes ativos agora',
        value: '4',
        sub: 'Live',
        pulse: true,
      },
      {
        label: 'Receita do dia',
        value: 'R$11.200',
        sub: '\u2191 +54% vs. sábado passado',
      },
      {
        label: 'Sessões ativas',
        value: '1.340',
        sub: '\u2191 pico em tempo real',
      },
      {
        label: 'Abandono no checkout',
        value: '28%',
        sub: '\u2193 melhor da semana',
      },
      {
        label: 'Pedidos hoje',
        value: '143',
        sub: '\u2191 +61 vs. ontem',
      },
    ],
  },
]

// ── Agent Cards (Co-workers in Action) ────────────────────────────

export const agentCards: AgentCard[] = [
  {
    id: 'sales',
    name: 'Sales Analyst',
    emoji: '\u{1F4C8}',
    badge: { label: 'Ativo', color: 'green' },
    pulse: true,
    stat1: '34 clientes com alta propensão',
    stat2: '12 carrinhos reengajados',
    summary:
      'O agente identificou 34 clientes com alta propensão de compra nas últimas 8h e reengajou 12 carrinhos abandonados automaticamente.',
    kpis: [
      {
        label: 'Receita recuperada',
        value: 'R$4.200',
        sub: '+18% vs. semana passada',
      },
      { label: 'Carrinhos reengajados', value: '12', sub: '+3 esta manhã' },
      { label: 'Clientes em fila', value: '34', sub: 'alta propensão' },
      { label: 'Taxa de conversão', value: '8,4%', sub: '+1.2pp vs. média' },
    ],
    actions: [
      {
        status: 'done',
        label: 'Segmentou clientes por propensão de compra',
        time: '03:14',
      },
      {
        status: 'done',
        label: 'Enviou 12 mensagens de reengajamento',
        time: '04:02',
      },
      {
        status: 'done',
        label: 'Atualizou fila de prioridade de vendas',
        time: '05:30',
      },
      {
        status: 'running',
        label: 'Monitorando conversões em tempo real',
        time: 'Agora',
      },
      {
        status: 'scheduled',
        label: 'Relatório diário de pipeline',
        time: '18:00',
      },
    ],
  },
  {
    id: 'retencao',
    name: 'Retenção',
    emoji: '\u{1F504}',
    badge: { label: '\u26A0 Atenção', color: 'amber' },
    pulse: true,
    stat1: '284 clientes inativos',
    stat2: 'Risco R$12.600',
    summary:
      '284 clientes estão inativos há 45+ dias, representando um risco de R$12.600 em receita. Campanha win-back aguarda aprovação.',
    kpis: [
      {
        label: 'Clientes inativos',
        value: '284',
        sub: '45+ dias sem compra',
      },
      { label: 'Receita em risco', value: 'R$12.600', sub: 'estimativa' },
      {
        label: 'Potencial win-back',
        value: 'R$4.800',
        sub: 'taxa histórica 38%',
      },
      { label: 'Custo da campanha', value: 'R$0', sub: 'automação ativa' },
    ],
    actions: [
      {
        status: 'done',
        label: 'Identificou 284 clientes em risco de churn',
        time: '02:00',
      },
      {
        status: 'done',
        label: 'Segmentou por ticket médio e frequência',
        time: '02:15',
      },
      {
        status: 'pending',
        label: 'Campanha win-back via WhatsApp — aguardando aprovação',
        time: 'Pendente',
      },
      {
        status: 'pending',
        label: 'E-mail de reativação com cupom personalizado',
        time: 'Pendente',
      },
    ],
  },
  {
    id: 'cs',
    name: 'Customer Service',
    emoji: '\u{1F4AC}',
    badge: { label: 'Ativo', color: 'blue' },
    pulse: true,
    stat1: '156 perguntas resolvidas',
    stat2: '2min médio \u00B7 94% satisfação',
    summary:
      'O agente respondeu 156 perguntas automaticamente nas últimas 8h com 94% de satisfação e tempo médio de 2 minutos.',
    kpis: [
      { label: 'Perguntas resolvidas', value: '156', sub: 'últimas 8h' },
      { label: 'Tempo médio', value: '2min', sub: '-30s vs. ontem' },
      { label: 'Satisfação', value: '94%', sub: '+2pp vs. semana' },
      { label: 'Escalamentos', value: '3', sub: 'para humano' },
    ],
    actions: [
      {
        status: 'done',
        label: 'Respondeu 156 tickets automaticamente',
        time: 'Contínuo',
      },
      {
        status: 'done',
        label: 'Escalou 3 casos complexos para equipe humana',
        time: '07:45',
      },
      {
        status: 'running',
        label: 'Monitorando fila de atendimento',
        time: 'Agora',
      },
      {
        status: 'scheduled',
        label: 'Resumo de satisfação do dia',
        time: '20:00',
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Agent',
    emoji: '\u{1F4E3}',
    badge: { label: 'Inativo', color: 'neutral' },
    pulse: false,
    inactive: true,
    stat1: 'este agente poderia recuperar',
    stat2: 'R$8.400/mês',
    stat3: 'em oportunidades de upsell',
    summary:
      'Este agente não está ativo. Ao ativar, ele identificará oportunidades de upsell e cross-sell automaticamente.',
    kpis: [
      {
        label: 'Potencial mensal',
        value: 'R$8.400',
        sub: 'estimativa de upsell',
      },
      { label: 'Segmentos identificados', value: '\u2014', sub: 'inativo' },
      { label: 'Campanhas criadas', value: '\u2014', sub: 'inativo' },
      { label: 'ROI estimado', value: '4.2x', sub: 'baseado em histórico' },
    ],
    actions: [
      {
        status: 'pending',
        label: 'Ativar análise de oportunidades de upsell',
        time: '\u2014',
      },
      {
        status: 'pending',
        label: 'Configurar segmentação de produtos relacionados',
        time: '\u2014',
      },
      {
        status: 'pending',
        label: 'Criar primeira campanha automática',
        time: '\u2014',
      },
    ],
  },
]

// ── Opportunities ─────────────────────────────────────────────────

export const opportunities: Opportunity[] = [
  {
    emoji: '\u{1F4C8}',
    avatarUrl: '/images/coworker-avatars/revenue-intelligence.jpg',
    agent: 'Sales Analyst',
    summary:
      'Taxa de abandono no checkout mobile 34% maior que desktop, com 89 sessões afetadas hoje. Ação imediata pode recuperar ~R$3.200.',
    value: '~R$3.200',
    cta: 'Agir \u2192',
  },
  {
    emoji: '\u{1F52D}',
    avatarUrl: '/images/coworker-avatars/competitor-watch.jpg',
    agent: 'Competitors',
    summary:
      'Concorrente reduziu preço em 3 SKUs core, identificado às 03:14. Pode afetar diretamente a conversão no segmento de eletrônicos.',
    value: 'Risco alto',
    cta: 'Ver análise \u2192',
  },
  {
    emoji: '\u{1F4CA}',
    avatarUrl: '/images/coworker-avatars/revenue-intelligence.jpg',
    agent: 'Analytics',
    summary:
      'Tráfego orgânico 18% maior nos finais de semana — oportunidade de alta confiança para campanhas direcionadas.',
    value: '+R$1.800',
    cta: 'Criar campanha \u2192',
  },
]
