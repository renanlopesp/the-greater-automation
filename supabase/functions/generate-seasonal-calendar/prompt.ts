// Seasonal calendar prompt + JSON schema (Deno port of src/lib/ai/seasonal-campaign-generator.ts)
// Pure strings + JSON schema — no Node, no Zod, no @/ imports.

export interface BrandDnaInput {
  niche: string
  audience: string
  positioning: string
  tone: string
  average_ticket: number
  opportunities: Array<{
    title: string
    description: string
    estimated_revenue: number
  }>
}

export interface StoreInput {
  name?: string
}

export interface ProductInput {
  name: string
  category?: string | null
  price: number
}

export interface CalendarDate {
  id: string
  name: string
  emoji: string
  date: string
  displayDate: string
  month: string
  day: string
  type: 'universal' | 'niche'
  relevanceReason: string
  estimatedRevenue: number
  potentialValue: string
  priority: 'high' | 'medium' | 'low'
}

export interface CalendarData {
  year: number
  generatedAt: string
  dates: CalendarDate[]
  summary: {
    totalDates: number
    totalPotentialRevenue: number
    nextActionableDate: string | null
  }
  nextYearSuggested: boolean
}

// ---------------------------------------------------------------------------
// JSON Schema (converted from Zod PersonalizedCalendarSchema)
// ---------------------------------------------------------------------------

export const CALENDAR_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['year', 'generatedAt', 'dates', 'summary', 'nextYearSuggested'],
  properties: {
    year: { type: 'number' },
    generatedAt: { type: 'string' },
    dates: {
      type: 'array',
      minItems: 5,
      maxItems: 25,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'name',
          'emoji',
          'date',
          'displayDate',
          'month',
          'day',
          'type',
          'relevanceReason',
          'estimatedRevenue',
          'potentialValue',
          'priority',
        ],
        properties: {
          id: { type: 'string', description: 'ID único da data (ex: dia-das-maes-2026)' },
          name: { type: 'string', description: 'Nome da data sazonal' },
          emoji: { type: 'string', description: 'Emoji representativo' },
          date: { type: 'string', description: 'Data ISO (YYYY-MM-DD)' },
          displayDate: { type: 'string', description: 'Data formatada (ex: 11 de Maio)' },
          month: { type: 'string', description: 'Mês abreviado (ex: Mai)' },
          day: { type: 'string', description: 'Dia do mês' },
          type: {
            type: 'string',
            enum: ['universal', 'niche'],
            description: 'Tipo: universal (Black Friday) ou nicho (Dia do Dentista)',
          },
          relevanceReason: {
            type: 'string',
            description: 'Por que essa data é relevante para essa loja',
          },
          estimatedRevenue: { type: 'number', description: 'Receita estimada em reais' },
          potentialValue: { type: 'string', description: 'Receita formatada (ex: R$ 85.000)' },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Prioridade para essa loja',
          },
        },
      },
    },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['totalDates', 'totalPotentialRevenue', 'nextActionableDate'],
      properties: {
        totalDates: { type: 'number' },
        totalPotentialRevenue: { type: 'number' },
        nextActionableDate: { type: ['string', 'null'] },
      },
    },
    nextYearSuggested: { type: 'boolean' },
  },
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

export function buildCalendarSystemPrompt(input: {
  brandDna: BrandDnaInput
  store?: StoreInput
  products: ProductInput[]
  year: number
  currentDate: Date
}): string {
  const { brandDna, products, year, currentDate } = input
  const currentDateISO = currentDate.toISOString().split('T')[0]
  const productCategories = [
    ...new Set(products.filter((p) => p.category).map((p) => p.category as string)),
  ]
  const opportunitiesContext =
    brandDna.opportunities.length > 0
      ? `\nOportunidades já identificadas na análise de DNA da marca (use como datas-semente prioritárias):\n${brandDna.opportunities
          .map(
            (o) =>
              `- ${o.title}: ${o.description} (receita estimada: R$ ${o.estimated_revenue.toLocaleString('pt-BR')})`
          )
          .join('\n')}`
      : ''

  return `Você é o Snew, um CMO de IA especializado em e-commerce brasileiro. Sua tarefa é gerar um calendário sazonal personalizado para ${year} com as datas mais relevantes para essa loja específica.

PERFIL DA LOJA:
- Nicho: ${brandDna.niche}
- Público-alvo: ${brandDna.audience}
- Posicionamento: ${brandDna.positioning}
- Tom de comunicação: ${brandDna.tone}
- Ticket médio: R$ ${brandDna.average_ticket.toLocaleString('pt-BR')}
- Categorias de produtos: ${productCategories.length > 0 ? productCategories.join(', ') : 'não informadas'}
${opportunitiesContext}

DATA ATUAL: ${currentDateISO}
ANO DO CALENDÁRIO: ${year}

INSTRUÇÕES:

1. SELEÇÃO DE DATAS (10-20 datas no total):
   - Inclua as grandes datas universais do varejo brasileiro FILTRADAS por relevância para o nicho: Carnaval, Dia da Mulher, Páscoa, Dia das Mães, Dia dos Namorados, Dia dos Pais, Dia das Crianças, Black Friday, Natal, Ano Novo.
   - Inclua 3-6 datas de NICHO específicas para esse segmento de mercado (ex: para pet shop: Dia dos Animais 04/10; para academia: Dia do Atleta 19/07; para bebês: Dia do Bebê 11/08).
   - Priorize as oportunidades identificadas no DNA da marca como datas de alta prioridade.
   - OBRIGATÓRIO: NÃO inclua datas que já passaram (anteriores a ${currentDateISO}). Todas as datas retornadas DEVEM ter campo "date" posterior a ${currentDateISO}. Se Carnaval/Páscoa/etc já passou neste ano, inclua a versão do próximo ano (ex: se Carnaval 2026 já passou, use Carnaval 2027).

2. TIPO (type):
   - 'universal': datas amplamente conhecidas e comercializadas (Black Friday, Natal, Dia das Mães)
   - 'niche': datas específicas para o segmento (Dia do Pet, Dia da Nutrição, etc.)

3. RECEITA ESTIMADA (estimatedRevenue):
   - Calcule como: ticket_médio × volume_estimado_de_pedidos × multiplicador_sazonal
   - Para datas de alta conversão (Natal, Black Friday, Dia das Mães): multiplicador 3-5x o volume normal
   - Para datas médias: multiplicador 1.5-2.5x
   - Para datas de nicho: multiplicador 1-1.5x
   - Seja realista para o mercado de e-commerce brasileiro

4. PRIORIDADE (priority):
   - 'high': data com alto potencial de receita E alta relevância para o nicho
   - 'medium': boa relevância ou bom potencial, mas não os dois
   - 'low': data genérica com baixa relevância para o nicho específico

5. NEXT ACTIONABLE DATE (summary.nextActionableDate):
   - Retorne o ID da próxima data acionável (dentro dos próximos 45 dias a partir de ${currentDateISO})
   - Null se não houver datas dentro desse período

6. NEXT YEAR SUGGESTED (nextYearSuggested):
   - true se mais de 70% das datas geradas estão no passado (a loja deve gerar o calendário para o próximo ano)
   - false caso contrário

7. FORMATO DAS DATAS:
   - id: kebab-case único (ex: black-friday-2026)
   - date: YYYY-MM-DD
   - displayDate: "25 de Dezembro" (por extenso em PT-BR)
   - month: abreviação de 3 letras em PT-BR (Jan, Fev, Mar, Abr, Mai, Jun, Jul, Ago, Set, Out, Nov, Dez)
   - day: número do dia como string (ex: "25")

Toda a saída deve estar em Português do Brasil.`
}

export function buildCalendarUserPrompt(input: { year: number; currentDate: Date }): string {
  const currentDateISO = input.currentDate.toISOString().split('T')[0]
  return `Gere o calendário sazonal personalizado para o ano ${input.year} com base no perfil da loja descrito acima. Data atual: ${currentDateISO}.`
}
