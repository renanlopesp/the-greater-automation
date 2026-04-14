import type { StoreContext } from './load-store-context'

export type FilterTab = 'all' | 'campaigns' | 'content' | 'analytics' | 'retention'

export interface CapabilityCard {
  id: string
  title: string
  skill: string
  category: FilterTab[]
  route: string
  autoPrompt: string
}

export const CAP_FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'content', label: 'Content' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'retention', label: 'Retention' },
]

export const INITIAL_VISIBLE = 6

/**
 * 12 capability cards shown under "What Snew can do for you".
 * Titles + autoPrompts interpolated with store context. If no store context,
 * sensible defaults are used.
 */
export function buildCapCards(_ctx: StoreContext | null): CapabilityCard[] {
  // Match prototype 1:1 — always use generic placeholders on card titles.
  // (Prototype doesn't inject brand context even when it exists.)
  const store = 'sua loja'
  const niche = 'e-commerce'
  const tone = ''
  const product = 'produto'
  const kw1 = 'qualidade'
  const kw2 = 'exclusividade'

  return [
    {
      id: 'c1',
      title: `Dia das Mães em 18 dias. ${store} ainda não publicou nada`,
      skill: 'Seasonal Calendar',
      category: ['campaigns'],
      route: '/agent',
      autoPrompt: `Criar campanha completa para o Dia das Mães para ${store}: post emocional, stories, carrossel de produto e copy para 3 canais. Nicho: ${niche}. Tom: ${tone || 'emocional e próximo'}.`,
    },
    {
      id: 'c2',
      title: `Visual de ${product} que para o scroll. Gerado em 30s`,
      skill: 'Image Generator',
      category: ['campaigns', 'content'],
      route: '/studio/create',
      autoPrompt: `Criar post editorial de ${product} para ${store}. Estilo ${tone || 'minimalista e premium'}, alta qualidade. Nicho ${niche}.`,
    },
    {
      id: 'c3',
      title: `Copy de ${kw1} e ${kw2} para 6 canais, adaptada ao tom da ${store}`,
      skill: 'Copywriter',
      category: ['content'],
      route: '/agent',
      autoPrompt: `Escrever copy completa para ${store} com headline, descrição e CTA adaptada para Instagram, TikTok, WhatsApp, e-mail, feed e stories. Tom: ${tone || 'autêntico'}. Produto: ${product}.`,
    },
    {
      id: 'c4',
      title: `30 dias de conteúdo para ${store}. Calendário pronto para publicar`,
      skill: 'Seasonal Calendar',
      category: ['campaigns'],
      route: '/agent',
      autoPrompt: `Criar calendário editorial completo de 30 dias para ${store}. Nicho: ${niche}. Incluir datas sazonais, tipo de conteúdo por dia, canal e copy sugerida. Tom: ${tone || 'próximo e autêntico'}.`,
    },
    {
      id: 'c5',
      title: 'Seus clientes pararam de comprar. Recupere antes de perder para o concorrente',
      skill: 'Retention Engine',
      category: ['retention'],
      route: '/agent',
      autoPrompt: `Criar campanha de retenção e reativação para clientes inativos de ${store}. Nicho: ${niche}. Gerar post de reengajamento com oferta e urgência, tom ${tone || 'próximo e direto'}.`,
    },
    {
      id: 'c6',
      title: `O que aconteceu na ${store} esta semana. Relatório em 10 segundos`,
      skill: 'Ops Pilot',
      category: ['analytics'],
      route: '/agent',
      autoPrompt: `Gerar relatório executivo semanal para ${store}: vendas, conversão, carrinhos abandonados, top produtos, alertas de agentes e top 3 ações prioritárias para a próxima semana. Nicho: ${niche}.`,
    },
    {
      id: 'c7',
      title: `Script de Reels que converte. ${product} em 15 segundos`,
      skill: 'Video Script Creator',
      category: ['content'],
      route: '/agent',
      autoPrompt: `Escrever script completo de Reels para ${store} mostrando ${product}. Hook de 3 segundos, desenvolvimento emocional, CTA final. Tom: ${tone || 'autêntico e direto'}. Nicho: ${niche}.`,
    },
    {
      id: 'c8',
      title: 'Dia dos Namorados. Campanha completa antes que o concorrente publique',
      skill: 'Seasonal Calendar',
      category: ['campaigns'],
      route: '/agent',
      autoPrompt: `Criar campanha de Dia dos Namorados para ${store}: post emocional de casal, stories de produto, copy de urgência e oferta especial. Tom: ${tone || 'romântico e próximo'}. Nicho: ${niche}.`,
    },
    {
      id: 'c9',
      title: '47 clientes em risco de churn. Plano de retenção personalizado',
      skill: 'Retention Engine',
      category: ['retention'],
      route: '/agent',
      autoPrompt: `Analisar clientes em risco de churn em ${store} (nicho: ${niche}) e gerar plano de retenção com: segmentação por risco, sequência de mensagens personalizadas, ofertas por segmento e KPIs de acompanhamento.`,
    },
    {
      id: 'c10',
      title: `Tom e identidade da ${store}. Consistente em todos os canais`,
      skill: 'Brand DNA',
      category: ['analytics'],
      route: '/settings/brand-dna',
      autoPrompt: `Revisar e documentar o Brand DNA de ${store}: tom de voz, vocabulário da marca, arquétipo, mensagem central, o que nunca dizer e exemplos de copy on-brand vs off-brand. Nicho: ${niche}. Palavras-chave da marca: qualidade, autenticidade.`,
    },
    {
      id: 'c11',
      title: `Black Friday da ${store}. Estratégia 4 semanas antes do pico`,
      skill: 'Seasonal Calendar',
      category: ['campaigns'],
      route: '/agent',
      autoPrompt: `Planejar Black Friday completa para ${store}: cronograma de 4 semanas, teasers, dia do evento e pós-venda. Incluir posts, stories, copies e estratégia de desconto sustentável. Nicho: ${niche}.`,
    },
    {
      id: 'c12',
      title: 'Estoque crítico antes da próxima campanha. Verifique agora',
      skill: 'Inventory Manager',
      category: ['analytics'],
      route: '/agent',
      autoPrompt: `Gerar análise de estoque para ${store} antes da próxima campanha sazonal: produtos em risco de ruptura, excesso de inventário para liquidação, reposição sugerida por fornecedor e impacto no faturamento. Nicho: ${niche}.`,
    },
  ]
}
