import { generateObject } from 'ai'
import { z } from 'zod'
import { getOpenAIProvider } from '@/lib/ai/agent-chat'
import type {
  FullCampaign,
  ProductTag,
  CampaignConcept,
  CampaignProduct,
} from '@/data/campaign-data'

// ---------------------------------------------------------------------------
// PersonalizedCalendar schemas
// ---------------------------------------------------------------------------

const PersonalizedDateSchema = z.object({
  id: z.string().describe('ID único da data (ex: dia-das-maes-2026)'),
  name: z.string().describe('Nome da data sazonal'),
  emoji: z.string().describe('Emoji representativo'),
  date: z.string().describe('Data ISO (YYYY-MM-DD)'),
  displayDate: z.string().describe('Data formatada (ex: 11 de Maio)'),
  month: z.string().describe('Mês abreviado (ex: Mai)'),
  day: z.string().describe('Dia do mês'),
  type: z
    .enum(['universal', 'niche'])
    .describe('Tipo: universal (Black Friday) ou nicho (Dia do Dentista)'),
  relevanceReason: z.string().describe('Por que essa data é relevante para essa loja'),
  estimatedRevenue: z.number().describe('Receita estimada em reais'),
  potentialValue: z.string().describe('Receita formatada (ex: R$ 85.000)'),
  priority: z.enum(['high', 'medium', 'low']).describe('Prioridade para essa loja'),
})

const PersonalizedCalendarSchema = z.object({
  year: z.number(),
  generatedAt: z.string(),
  dates: z.array(PersonalizedDateSchema).min(5).max(25),
  summary: z.object({
    totalDates: z.number(),
    totalPotentialRevenue: z.number(),
    nextActionableDate: z.string().nullable(),
  }),
  nextYearSuggested: z.boolean(),
})

export type PersonalizedDate = z.infer<typeof PersonalizedDateSchema>
export type PersonalizedCalendar = z.infer<typeof PersonalizedCalendarSchema>

// ---------------------------------------------------------------------------
// FullCampaign schemas (mirrors src/data/campaign-data.ts types)
// ---------------------------------------------------------------------------

const ProductTagSchema = z.enum([
  'best-seller',
  'liberar-estoque',
  'cross-sell',
  'lancamento',
  'alta-margem',
] as [ProductTag, ...ProductTag[]])

const CampaignProductSchema = z.object({
  product_id: z
    .string()
    .describe('ID do produto — retorne EXATAMENTE o product_id fornecido na lista de produtos'),
  name: z.string().describe('Nome do produto'),
  price: z.number().describe('Preço em reais'),
  tag: ProductTagSchema.describe(
    'Tag do produto: best-seller, liberar-estoque, cross-sell, lancamento ou alta-margem'
  ),
  stock: z.number().nullable().describe('Quantidade em estoque (null se desconhecido)'),
  image_url: z.string().nullable().describe('URL da imagem do produto (null se não disponível)'),
})

const CampaignConceptSchema = z.object({
  slogan: z.string().describe('Slogan principal da campanha'),
  description: z.string().describe('Descrição estratégica do conceito da campanha'),
  products: z
    .array(CampaignProductSchema)
    .min(1)
    .describe('Produtos principais do conceito — inclua todos os relevantes para a campanha'),
  alternates: z
    .array(
      z.object({
        slogan: z.string(),
        description: z.string(),
      })
    )
    .min(2)
    .max(3)
    .describe('Conceitos alternativos para a campanha'),
})

const CampaignCopySchema = z.object({
  channel: z.string().describe('Canal de comunicação (ex: WhatsApp VIP, Instagram Caption)'),
  timing: z.string().describe('Momento de envio (ex: D-7, D-0)'),
  text: z.string().describe('Texto da copy pronto para uso'),
})

const CampaignAssetSchema = z.object({
  label: z.string().describe('Nome do asset (ex: Stories 9:16)'),
  ratio: z.string().describe('Proporção do asset (ex: 9:16, 1:1, 3:1)'),
  bg: z.string().describe('CSS background para o asset (gradiente ou cor)'),
})

const CampaignVideoScriptSchema = z.object({
  title: z.string().describe('Título do roteiro (ex: Reels 30s)'),
  duration: z.string().describe('Duração (ex: 30 segundos)'),
  content: z.string().describe('Roteiro completo com timestamps e descrição de cenas'),
})

const CampaignTimelineItemSchema = z.object({
  day: z.string().describe('Fase da campanha (ex: D-45, D-Day)'),
  actions: z.array(z.string()).min(3).max(5).describe('Ações a executar nessa fase'),
})

const FullCampaignSchema = z.object({
  intro: z.string().describe('Parágrafo introdutório com análise estratégica da data para a loja'),
  concept: CampaignConceptSchema,
  selectedProducts: z
    .array(CampaignProductSchema)
    .min(1)
    .describe(
      'Todos os produtos relevantes para a campanha — inclua quantos fizerem sentido para a data e o nicho'
    ),
  emailSubject: z.string().describe('Assunto do e-mail de campanha'),
  emailPreview: z.string().describe('Preview text do e-mail (apareça abaixo do assunto)'),
  copies: z
    .array(CampaignCopySchema)
    .min(5)
    .max(5)
    .describe('Exatamente 5 copies: WhatsApp VIP, WhatsApp Geral, Instagram Caption, Meta Ad, SMS'),
  assets: z
    .array(CampaignAssetSchema)
    .min(4)
    .max(4)
    .describe(
      'Exatamente 4 assets: Stories 9:16, Feed 1:1, Banner E-mail 3:1, Stories Meta Ad 9:16'
    ),
  videoScripts: z
    .array(CampaignVideoScriptSchema)
    .min(2)
    .max(2)
    .describe('Exatamente 2 roteiros: Reels 30s e Reels 60s'),
  timeline: z
    .array(CampaignTimelineItemSchema)
    .min(6)
    .max(6)
    .describe('Exatamente 6 fases: D-45, D-30, D-15, D-7, D-1 (ou D-3), D-Day'),
})

// ---------------------------------------------------------------------------
// generateCalendar
// ---------------------------------------------------------------------------

export async function generateCalendar(params: {
  brandDna: {
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
  products: Array<{ name: string; category?: string; price: number }>
  currentDate: Date
  year: number
}): Promise<PersonalizedCalendar> {
  const openai = getOpenAIProvider()
  const { brandDna, products, currentDate, year } = params

  const currentDateISO = currentDate.toISOString().split('T')[0]
  const productCategories = [...new Set(products.filter((p) => p.category).map((p) => p.category))]
  const opportunitiesContext =
    brandDna.opportunities.length > 0
      ? `\nOportunidades já identificadas na análise de DNA da marca (use como datas-semente prioritárias):\n${brandDna.opportunities.map((o) => `- ${o.title}: ${o.description} (receita estimada: R$ ${o.estimated_revenue.toLocaleString('pt-BR')})`).join('\n')}`
      : ''

  const systemPrompt = `Você é o Snew, um CMO de IA especializado em e-commerce brasileiro. Sua tarefa é gerar um calendário sazonal personalizado para ${year} com as datas mais relevantes para essa loja específica.

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

  const { object } = await generateObject({
    model: openai.chat('gpt-4o'),
    schema: PersonalizedCalendarSchema,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Gere o calendário sazonal personalizado para o ano ${year} com base no perfil da loja descrito no prompt de sistema. Data atual: ${currentDateISO}.`,
      },
    ],
  })

  // Post-generation fix: bump past dates to next year
  const now = new Date()
  for (const date of object.dates) {
    if (date.date) {
      const dateObj = new Date(date.date)
      if (dateObj < now) {
        dateObj.setFullYear(dateObj.getFullYear() + 1)
        date.date = dateObj.toISOString().split('T')[0]
        date.id = date.id.replace(/\d{4}$/, String(dateObj.getFullYear()))
        const yearStr = String(dateObj.getFullYear())
        if (!date.displayDate.includes(yearStr)) {
          date.displayDate = date.displayDate.replace(/\d{4}/, yearStr)
        }
      }
    }
  }

  return object
}

// ---------------------------------------------------------------------------
// generateCampaign
// ---------------------------------------------------------------------------

export async function generateCampaign(params: {
  date: {
    id: string
    name: string
    emoji: string
    displayDate: string
  }
  brandDna: {
    niche: string
    tone: string
    audience: string
    positioning: string
    words_to_use: string[]
    words_to_avoid: string[]
    average_ticket: number
  }
  products: Array<{
    product_id?: string
    name: string
    price: number
    image_url?: string
    category?: string
    description?: string
    cost_price?: number
    stock_quantity?: number
    sales_count?: number
    margin_pct?: number
    suggested_tag?: string
  }>
}): Promise<FullCampaign> {
  const openai = getOpenAIProvider()
  const { date, brandDna, products } = params

  const productsContext =
    products.length > 0
      ? `\nPRODUTOS DISPONÍVEIS NA LOJA (selecione os mais adequados para a campanha):\n${products
          .slice(0, 30)
          .map((p) => {
            const parts = [
              `- [ID: ${p.product_id ?? 'unknown'}] ${p.name}: R$ ${p.price.toLocaleString('pt-BR')}`,
            ]
            if (p.stock_quantity != null) parts.push(`estoque: ${p.stock_quantity}`)
            if (p.sales_count != null && p.sales_count > 0)
              parts.push(`vendas (90d): ${p.sales_count}`)
            if (p.margin_pct != null) parts.push(`margem: ${p.margin_pct.toFixed(0)}%`)
            if (p.suggested_tag) parts.push(`tag sugerida: ${p.suggested_tag}`)
            if (p.category) parts.push(`categoria: ${p.category}`)
            if (p.description) parts.push(`desc: ${p.description}`)
            return parts[0] + (parts.length > 1 ? ` (${parts.slice(1).join(', ')})` : '')
          })
          .join('\n')}`
      : '\nNenhum produto cadastrado — crie produtos representativos baseados no nicho da loja.'

  const systemPrompt = `Você é o Snew, um CMO de IA especializado em e-commerce brasileiro. Sua tarefa é criar uma campanha completa e personalizada para a data sazonal indicada.

DATA DA CAMPANHA: ${date.emoji} ${date.name} — ${date.displayDate}

PERFIL DA LOJA:
- Nicho: ${brandDna.niche}
- Público-alvo: ${brandDna.audience}
- Posicionamento: ${brandDna.positioning}
- Tom de comunicação: ${brandDna.tone}
- Ticket médio: R$ ${brandDna.average_ticket.toLocaleString('pt-BR')}
- Palavras para usar: ${brandDna.words_to_use.join(', ')}
- Palavras para evitar: ${brandDna.words_to_avoid.join(', ')}
${productsContext}

INSTRUÇÕES PARA CADA SEÇÃO DA CAMPANHA:

1. INTRO: Escreva 2-3 frases estratégicas explicando por que essa data é importante para ESSA loja específica e qual é a abordagem recomendada. Seja direto e analítico como um CMO sênior.

2. CONCEPT (conceito criativo):
   - slogan: 1 frase curta e impactante, alinhada ao tom da marca
   - description: Explique a estratégia criativa — por que esse ângulo, como ele ressoa com o público
   - products: TODOS os produtos relevantes para o conceito da campanha, com tag adequada (best-seller/liberar-estoque/cross-sell/lancamento/alta-margem). Não limite a quantidade — inclua todos que fazem sentido.
   - alternates: 2 conceitos alternativos com slogan + descrição (para diferentes ângulos estratégicos)

3. SELECTED PRODUCTS: TODOS os produtos relevantes para a campanha com estoque disponível. Inclua quantos fizerem sentido para a data e o nicho — pode ser 5, 10, 15 ou mais. Use produtos reais da loja quando disponíveis, priorizando os com melhor tag (best-seller, alta-margem). Distribua as tags estrategicamente.

4. EMAIL: emailSubject (assunto chamativo, máx 60 chars) + emailPreview (preview text de 80-100 chars que complemente o assunto)

5. COPIES — exatamente 5 canais em ordem:
   - WhatsApp VIP (timing D-7 a D-14): mensagem personalizada para clientes fiéis, tom próximo, antecipação
   - WhatsApp Geral (timing D-1 a D-3): urgência, prazo de entrega, oferta principal
   - Instagram Caption (timing D-5 a D-10): copy emocional, parágrafos curtos, hashtags no final
   - Meta Ad (timing D-14 a D-20): copy direta com preço/benefício, CTA claro
   - SMS (timing D-1 a D-3): máx 160 chars, link encurtado [link], urgência máxima

6. ASSETS — exatamente 4 formatos em ordem:
   - Stories 9:16 (ratio: "9:16")
   - Feed 1:1 (ratio: "1:1")
   - Banner E-mail (ratio: "3:1")
   - Stories Meta Ad (ratio: "9:16")
   Para cada asset, crie um gradiente CSS temático adequado à data e ao posicionamento da marca. Use cores que remetam à data (ex: rosa/pink para Dia das Mães, verde/dourado para Natal).

7. VIDEO SCRIPTS — exatamente 2 roteiros:
   - Reels 30s: roteiro com timestamps em segundos (0-3s, 3-10s, etc.), descrição de cena, texto na tela, CTA final
   - Reels 60s: roteiro mais desenvolvido com hook, storytelling, produto em ação, depoimento ou prova social, CTA

8. TIMELINE — exatamente 6 fases em ordem:
   - D-45: preparação estratégica e produção
   - D-30: briefings e configurações
   - D-15: início das campanhas pagas e e-mail
   - D-7: comunicação VIP e intensificação
   - D-1 ou D-3: urgência máxima
   - D-Day: execução no dia, monitoramento, pós-venda

IMPORTANTE:
- Use as palavras indicadas e evite as palavras proibidas em todas as copies
- Mantenha consistência de tom em todos os canais
- Os textos devem soar naturais para o mercado brasileiro, não traduzidos
- Toda a saída deve estar em Português do Brasil
- OBRIGATÓRIO: Para cada produto, retorne o campo product_id EXATAMENTE como fornecido na lista (ex: "12345"). Isso é crítico para vincular imagens e dados. NÃO invente IDs.
- Use as tags sugeridas (best-seller, alta-margem, etc.) quando fornecidas — elas são baseadas em dados reais de vendas e margem da loja.`

  const { object } = await generateObject({
    model: openai.chat('gpt-4o'),
    schema: FullCampaignSchema,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Gere a campanha completa para "${date.name}" (${date.displayDate}) personalizada para essa loja.`,
      },
    ],
  })

  return object as FullCampaign
}

// ---------------------------------------------------------------------------
// regenerateSection
// ---------------------------------------------------------------------------

const SectionSchemas = {
  products: z.object({
    selectedProducts: FullCampaignSchema.shape.selectedProducts,
  }),
  copies: z.object({
    copies: FullCampaignSchema.shape.copies,
  }),
  email: z.object({
    emailSubject: FullCampaignSchema.shape.emailSubject,
    emailPreview: FullCampaignSchema.shape.emailPreview,
  }),
  assets: z.object({
    assets: FullCampaignSchema.shape.assets,
  }),
  video: z.object({
    videoScripts: FullCampaignSchema.shape.videoScripts,
  }),
  timeline: z.object({
    timeline: FullCampaignSchema.shape.timeline,
  }),
} as const

type SectionType = keyof typeof SectionSchemas

export async function regenerateSection(params: {
  sectionType: SectionType
  existingCampaign: FullCampaign
  brandDna: {
    niche: string
    tone: string
    audience: string
    positioning: string
    words_to_use: string[]
    words_to_avoid: string[]
  }
}): Promise<Partial<FullCampaign>> {
  const openai = getOpenAIProvider()
  const { sectionType, existingCampaign, brandDna } = params

  const sectionLabels: Record<SectionType, string> = {
    products: 'produtos selecionados (selectedProducts)',
    copies:
      'copies para os 5 canais (WhatsApp VIP, WhatsApp Geral, Instagram Caption, Meta Ad, SMS)',
    email: 'assunto e preview do e-mail (emailSubject + emailPreview)',
    assets:
      '4 assets visuais com gradientes CSS (Stories 9:16, Feed 1:1, Banner E-mail, Stories Meta Ad)',
    video: '2 roteiros de vídeo (Reels 30s e Reels 60s)',
    timeline: '6 fases da timeline de campanha (D-45 até D-Day)',
  }

  const systemPrompt = `Você é o Snew, um CMO de IA especializado em e-commerce brasileiro. Sua tarefa é regenerar APENAS a seção "${sectionLabels[sectionType]}" de uma campanha existente, mantendo coerência com o conceito já definido.

CONCEITO DA CAMPANHA EXISTENTE:
- Slogan: "${existingCampaign.concept.slogan}"
- Descrição: "${existingCampaign.concept.description}"
- Intro estratégica: "${existingCampaign.intro}"

PERFIL DA LOJA:
- Nicho: ${brandDna.niche}
- Público-alvo: ${brandDna.audience}
- Posicionamento: ${brandDna.positioning}
- Tom de comunicação: ${brandDna.tone}
- Palavras para usar: ${brandDna.words_to_use.join(', ')}
- Palavras para evitar: ${brandDna.words_to_avoid.join(', ')}

INSTRUÇÕES:
- Gere uma NOVA versão da seção "${sectionLabels[sectionType]}" diferente da versão atual
- Mantenha alinhamento com o conceito, tom e posicionamento da campanha
- Use as palavras indicadas e evite as palavras proibidas
- Toda a saída deve estar em Português do Brasil`

  const schema = SectionSchemas[sectionType]

  const { object } = await generateObject({
    model: openai.chat('gpt-4o'),
    schema,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Regenere a seção "${sectionLabels[sectionType]}" com uma nova abordagem criativa, mantendo coerência com o conceito "${existingCampaign.concept.slogan}".`,
      },
    ],
  })

  return object as Partial<FullCampaign>
}

// ---------------------------------------------------------------------------
// generateConcept — Phase 1 only (concept + products, no deliverables)
// ---------------------------------------------------------------------------

const ConceptOnlySchema = z.object({
  intro: z.string().describe('Parágrafo introdutório com análise estratégica da data para a loja'),
  concept: CampaignConceptSchema,
  selectedProducts: z
    .array(CampaignProductSchema)
    .min(1)
    .describe(
      'Todos os produtos relevantes para a campanha — inclua quantos fizerem sentido para a data e o nicho'
    ),
})

export async function generateConcept(params: {
  date: {
    id: string
    name: string
    emoji: string
    displayDate: string
  }
  brandDna: {
    niche: string
    tone: string
    audience: string
    positioning: string
    words_to_use: string[]
    words_to_avoid: string[]
    average_ticket: number
  }
  products: Array<{
    product_id?: string
    name: string
    price: number
    image_url?: string
    category?: string
    description?: string
    stock_quantity?: number
    sales_count?: number
    margin_pct?: number
    suggested_tag?: string
  }>
}): Promise<{ intro: string; concept: CampaignConcept; selectedProducts: CampaignProduct[] }> {
  const openai = getOpenAIProvider()
  const { date, brandDna, products } = params

  const productsContext =
    products.length > 0
      ? `\nPRODUTOS DISPONÍVEIS NA LOJA (selecione os mais adequados para a campanha):\n${products
          .slice(0, 30)
          .map((p) => {
            const parts = [
              `- [ID: ${p.product_id ?? 'unknown'}] ${p.name}: R$ ${p.price.toLocaleString('pt-BR')}`,
            ]
            if (p.stock_quantity != null) parts.push(`estoque: ${p.stock_quantity}`)
            if (p.sales_count != null && p.sales_count > 0)
              parts.push(`vendas (90d): ${p.sales_count}`)
            if (p.margin_pct != null) parts.push(`margem: ${p.margin_pct.toFixed(0)}%`)
            if (p.suggested_tag) parts.push(`tag sugerida: ${p.suggested_tag}`)
            if (p.category) parts.push(`categoria: ${p.category}`)
            if (p.description) parts.push(`desc: ${p.description}`)
            return parts[0] + (parts.length > 1 ? ` (${parts.slice(1).join(', ')})` : '')
          })
          .join('\n')}`
      : '\nNenhum produto cadastrado — crie produtos representativos baseados no nicho da loja.'

  const systemPrompt = `Você é o Snew, um CMO de IA especializado em e-commerce brasileiro. Sua tarefa é criar o CONCEITO e SELEÇÃO DE PRODUTOS para uma campanha sazonal. NÃO gere copies, e-mail, assets, vídeos ou timeline — apenas o conceito criativo e a seleção de produtos.

DATA DA CAMPANHA: ${date.emoji} ${date.name} — ${date.displayDate}

PERFIL DA LOJA:
- Nicho: ${brandDna.niche}
- Público-alvo: ${brandDna.audience}
- Posicionamento: ${brandDna.positioning}
- Tom de comunicação: ${brandDna.tone}
- Ticket médio: R$ ${brandDna.average_ticket.toLocaleString('pt-BR')}
- Palavras para usar: ${brandDna.words_to_use.join(', ')}
- Palavras para evitar: ${brandDna.words_to_avoid.join(', ')}
${productsContext}

INSTRUÇÕES:

1. INTRO: 2-3 frases estratégicas explicando por que essa data é importante para ESSA loja específica.

2. CONCEPT:
   - slogan: 1 frase curta e impactante
   - description: Estratégia criativa — por que esse ângulo ressoa com o público
   - products: TODOS os produtos relevantes para o conceito, com tag adequada
   - alternates: 2 conceitos alternativos

3. SELECTED PRODUCTS: TODOS os produtos relevantes para a campanha. Inclua quantos fizerem sentido.

IMPORTANTE:
- Retorne o product_id EXATAMENTE como fornecido na lista.
- Use as tags sugeridas quando fornecidas — são baseadas em dados reais.
- Toda a saída em Português do Brasil.`

  const { object } = await generateObject({
    model: openai.chat('gpt-4o'),
    schema: ConceptOnlySchema,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Gere o conceito e seleção de produtos para "${date.name}" (${date.displayDate}).`,
      },
    ],
  })

  return object as { intro: string; concept: CampaignConcept; selectedProducts: CampaignProduct[] }
}
