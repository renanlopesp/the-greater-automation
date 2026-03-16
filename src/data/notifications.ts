export type NotificationCategory =
  | 'Conversion Optimizer'
  | 'Competitor Watch'
  | 'Customer Service'
  | 'Revenue Intelligence'

export interface Notification {
  id: string
  title: string
  description: string
  category: NotificationCategory
  read: boolean
  timestamp: string
}

export const categoryColors: Record<NotificationCategory, string> = {
  'Conversion Optimizer':
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Competitor Watch': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Customer Service': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Revenue Intelligence':
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export const notifications: Notification[] = [
  // ── New ────────────────────────────────────────────────────────
  {
    id: 'n1',
    title: 'Taxa de abandono mobile subiu 12%',
    description:
      'O checkout mobile apresentou aumento significativo de abandono nas ultimas 2 horas. 89 sessoes afetadas com potencial de recuperacao de R$3.200.',
    category: 'Conversion Optimizer',
    read: false,
    timestamp: '5 min atras',
  },
  {
    id: 'n2',
    title: 'Concorrente reduziu preco em 3 SKUs core',
    description:
      'Competitor Watch detectou alteracao de preco em 3 produtos do segmento de eletronicos. Reducao media de 15%. Impacto potencial na sua conversao.',
    category: 'Competitor Watch',
    read: false,
    timestamp: '12 min atras',
  },
  {
    id: 'n3',
    title: '284 clientes inativos identificados',
    description:
      'Segmento de clientes sem compra ha 45+ dias cresceu 8% esta semana. Campanha de win-back recomendada com estimativa de recuperacao R$4.800.',
    category: 'Customer Service',
    read: false,
    timestamp: '28 min atras',
  },
  {
    id: 'n4',
    title: 'Pico de trafego organico detectado',
    description:
      'Trafego organico esta 18% acima da media para este horario. Oportunidade de alta confianca para campanhas direcionadas de fim de semana.',
    category: 'Revenue Intelligence',
    read: false,
    timestamp: '1h atras',
  },

  // ── Earlier ────────────────────────────────────────────────────
  {
    id: 'n5',
    title: 'Campanha de email atingiu 42% de abertura',
    description:
      "A campanha 'Lancamento Verao' teve desempenho 2x acima da media. Recomendado enviar follow-up para quem abriu mas nao clicou.",
    category: 'Revenue Intelligence',
    read: true,
    timestamp: '3h atras',
  },
  {
    id: 'n6',
    title: 'Review negativa recorrente em produto #4521',
    description:
      "3 reviews negativas em 48h para o mesmo produto mencionando 'tamanho diferente do anunciado'. Acao recomendada: atualizar fotos e descricao.",
    category: 'Customer Service',
    read: true,
    timestamp: '5h atras',
  },
  {
    id: 'n7',
    title: 'ROAS do Google Ads caiu abaixo de 3x',
    description:
      "Campanha 'Generica - Busca' com ROAS de 2.1x nas ultimas 24h. Budget de R$450/dia pode estar sendo desperdicado.",
    category: 'Conversion Optimizer',
    read: true,
    timestamp: '8h atras',
  },
  {
    id: 'n8',
    title: 'Novo concorrente detectado no segmento',
    description:
      'Competitor Watch identificou nova loja ativa no mesmo nicho com precos agressivos. Ja tem 12 avaliacoes em 2 semanas.',
    category: 'Competitor Watch',
    read: true,
    timestamp: '12h atras',
  },
  {
    id: 'n9',
    title: 'Taxa de recompra subiu para 22%',
    description:
      'Melhoria de 4pp na taxa de recompra mensal, impulsionada pela campanha de retencao do Customer Service Agent.',
    category: 'Customer Service',
    read: true,
    timestamp: '1 dia atras',
  },
]
