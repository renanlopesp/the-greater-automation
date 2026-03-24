export type ActivityItemKind = 'attention' | 'running'

export interface ActivityItem {
  id: string
  kind: ActivityItemKind
  text: string
  meta: string
  action: string | null
  route: string | null
}

const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'a1',
    kind: 'attention',
    text: 'Aprovar briefing: Páscoa 2026',
    meta: 'D-28',
    action: 'Approve',
    route: '/skills/seasonal-calendar',
  },
  {
    id: 'a2',
    kind: 'attention',
    text: 'Dia dos Namorados sem campanha',
    meta: 'D-42',
    action: 'Generate',
    route: '/skills/seasonal-calendar',
  },
  {
    id: 'r1',
    kind: 'running',
    text: 'Gerando briefing para Dia das Mães...',
    meta: 'now',
    action: null,
    route: null,
  },
  {
    id: 'r2',
    kind: 'running',
    text: 'Analisando padrões de receita da semana',
    meta: 'now',
    action: null,
    route: null,
  },
]

export function useActivityFeed() {
  return { items: ACTIVITY_ITEMS }
}
