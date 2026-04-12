/* eslint-disable @typescript-eslint/no-explicit-any */
// Self-contained Edge Function — all helpers inlined to avoid import resolution
// failures in Supabase's flat-file deploy model.

/* ========== _shared/supabase.ts ========== */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

/* ========== _shared/errors.ts ========== */

function log(tag: string, fields: Record<string, unknown>): void {
  const msg = Object.entries(fields)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? JSON.stringify(v) : String(v)}`)
    .join(' ')
  console.log(`[${tag}] ${msg}`)
}

async function failTask(
  supabase: SupabaseClient,
  taskId: string,
  stage: string,
  message: string
): Promise<void> {
  console.error(`[failTask] taskId=${taskId} stage=${stage} message=${message.slice(0, 200)}`)
  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        skill_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
    if (error) console.error('[failTask] update error', JSON.stringify(error))
  } catch (err) {
    console.error('[failTask] update threw', err)
  }
}

/* ========== _shared/anthropic.ts ========== */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

interface MessageParam {
  role: 'user' | 'assistant'
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: unknown }
        | { type: 'tool_result'; tool_use_id: string; content: string }
      >
}

interface CallMessagesOptions {
  model: string
  system: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>
  messages: MessageParam[]
  max_tokens?: number
  temperature?: number
  tools?: unknown[]
}

async function callMessages(opts: CallMessagesOptions): Promise<{
  content: Array<{ type: string; text?: string; [k: string]: unknown }>
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY must be set (Supabase secret)')
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      max_tokens: 4096,
      temperature: 0.7,
      ...opts,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 400)}`)
  }
  return (await res.json()) as never
}

async function generateObject<T>(opts: {
  model: string
  system: string
  prompt: string
  schema: Record<string, unknown>
  schemaName?: string
  maxTokens?: number
}): Promise<T> {
  const toolName = opts.schemaName ?? 'emit_result'
  const result = await callMessages({
    model: opts.model,
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
    max_tokens: opts.maxTokens ?? 8192,
    tools: [
      {
        name: toolName,
        description: 'Emit the structured result matching the schema.',
        input_schema: opts.schema,
      },
    ],
  })
  const toolUse = result.content.find(
    (b) => b.type === 'tool_use' && (b as { name: string }).name === toolName
  ) as { type: 'tool_use'; input: T } | undefined
  if (!toolUse) throw new Error('Model did not emit the structured result tool call')
  return toolUse.input
}

/* ========== _shared/nuvemshop.ts ========== */

const NUVEM_BASE = 'https://api.nuvemshop.com.br/v1'

interface NuvemProduct {
  id: number
  name: { pt?: string; es?: string } | string
  variants?: Array<{ price?: string; stock?: number }>
  description?: { pt?: string }
  categories?: unknown[]
  images?: Array<{ src: string }>
}

interface NuvemStore {
  id: number
  name: { pt?: string } | string
  email?: string
  segment?: string
  country?: string
}

async function nuvemFetch<T>(
  storeId: string,
  token: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${NUVEM_BASE}/${storeId}${path}`)
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const userAgent = Deno.env.get('NUVEMSHOP_USER_AGENT') ?? 'Snew/1.0'
  const r = await fetch(url.toString(), {
    headers: { Authentication: `bearer ${token}`, 'User-Agent': userAgent },
  })
  if (!r.ok) throw new Error(`Nuvemshop ${r.status} ${r.statusText} — ${path}`)
  return (await r.json()) as T
}

async function fetchStore(storeId: string, token: string): Promise<NuvemStore> {
  return nuvemFetch<NuvemStore>(storeId, token, '/store')
}

async function fetchProducts(
  storeId: string,
  token: string,
  opts?: { limit?: number }
): Promise<NuvemProduct[]> {
  return nuvemFetch<NuvemProduct[]>(storeId, token, '/products', {
    per_page: String(opts?.limit ?? 200),
  })
}

/* ========== _shared/brand-dna.ts ========== */

interface BrandDna {
  niche?: string | null
  audience?: string | null
  positioning?: string | null
  tone?: string | null
  average_ticket?: number | null
  opportunities?: unknown[] | null
}

interface Store {
  id: string
  name: string
  segment?: string | null
  platform?: string | null
  platform_store_id?: string | null
  platform_access_token?: string | null
}

async function loadBrandDna(supabase: SupabaseClient, teamId: string): Promise<BrandDna | null> {
  const { data } = await supabase
    .from('brand_dna')
    .select('niche, audience, positioning, tone, average_ticket, opportunities')
    .eq('team_id', teamId)
    .single()
  return (data as BrandDna | null) ?? null
}

async function loadStoreForTeam(supabase: SupabaseClient, teamId: string): Promise<Store | null> {
  const { data } = await supabase
    .from('stores')
    .select('id, name, segment, platform, platform_store_id, platform_access_token')
    .eq('team_id', teamId)
    .limit(1)
    .single()
  return (data as Store | null) ?? null
}

/* ========== product-analyzer.ts ========== */

interface NuvemProductFull extends NuvemProduct {
  published?: boolean
  created_at?: string
  categories?: Array<{ name: { pt?: string } | string | Record<string, string> }>
  images?: Array<{ src: string }>
  variants?: Array<{
    price?: string
    stock?: number
    cost?: string
  }>
  description?: { pt?: string } | string | Record<string, string>
}

interface OrderLineItem {
  product_id: number | null
  quantity: string
}

interface NuvemOrderRaw {
  products: OrderLineItem[]
}

interface EnrichedProduct {
  product_id: string
  name: string
  price: number
  image_url: string | undefined
  category: string | undefined
  description: string | undefined
  cost_price: number | undefined
  stock_quantity: number
  sales_count: number
  margin_pct: number | undefined
  frequently_bought_with: string[]
  suggested_tag: string | undefined
}

function extractProductName(name: NuvemProductFull['name']): string {
  if (typeof name === 'object' && name !== null) {
    const obj = name as Record<string, string>
    return obj['pt'] ?? Object.values(obj)[0] ?? ''
  }
  return String(name ?? '')
}

function extractLocalized(
  val: { pt?: string } | string | Record<string, string> | undefined
): string | undefined {
  if (val == null) return undefined
  if (typeof val === 'string') return val || undefined
  const obj = val as Record<string, string>
  return obj['pt'] ?? Object.values(obj)[0] ?? undefined
}

function computeSalesCount(orders: NuvemOrderRaw[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const order of orders) {
    for (const item of order.products) {
      if (item.product_id == null) continue
      const qty = parseInt(item.quantity, 10) || 1
      counts.set(item.product_id, (counts.get(item.product_id) ?? 0) + qty)
    }
  }
  return counts
}

function computeMargins(products: NuvemProductFull[]): Map<number, number> {
  const margins = new Map<number, number>()
  for (const product of products) {
    const variant = product.variants?.[0]
    if (!variant?.price) continue
    const price = Number(variant.price)
    const cost = variant.cost
    if (cost == null || cost === '' || cost === '0.00') continue
    const costNum = Number(cost)
    if (costNum > 0 && price > 0) {
      margins.set(product.id, ((price - costNum) / price) * 100)
    }
  }
  return margins
}

function computeCoOccurrence(orders: NuvemOrderRaw[]): Map<number, number[]> {
  const coMap = new Map<number, Map<number, number>>()
  for (const order of orders) {
    const productIds = [
      ...new Set(
        order.products.map((item) => item.product_id).filter((id): id is number => id != null)
      ),
    ]
    for (const pid of productIds) {
      if (!coMap.has(pid)) coMap.set(pid, new Map())
      const pairCounts = coMap.get(pid)!
      for (const otherId of productIds) {
        if (otherId === pid) continue
        pairCounts.set(otherId, (pairCounts.get(otherId) ?? 0) + 1)
      }
    }
  }
  const result = new Map<number, number[]>()
  for (const [pid, pairCounts] of coMap) {
    const sorted = [...pairCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id)
    result.set(pid, sorted)
  }
  return result
}

function suggestTag(
  salesCount: number,
  marginPct: number | undefined,
  stock: number,
  avgSales: number,
  isRecent: boolean,
  coOccurrenceCount: number
): string | undefined {
  if (avgSales > 0 && salesCount >= avgSales * 2) return 'best-seller'
  if (marginPct != null && marginPct > 50) return 'alta-margem'
  if (stock > 0 && stock < 10) return 'liberar-estoque'
  if (isRecent) return 'lancamento'
  if (coOccurrenceCount >= 3) return 'cross-sell'
  return undefined
}

function analyzeProducts(
  rawProducts: NuvemProductFull[],
  orders: NuvemOrderRaw[]
): EnrichedProduct[] {
  const salesCounts = computeSalesCount(orders)
  const margins = computeMargins(rawProducts)
  const coOccurrence = computeCoOccurrence(orders)

  const allSales = [...salesCounts.values()]
  const avgSales = allSales.length > 0 ? allSales.reduce((a, b) => a + b, 0) / allSales.length : 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const enriched: EnrichedProduct[] = rawProducts
    .filter((p) => p.published !== false)
    .map((product) => {
      const productId = product.id
      const name = extractProductName(product.name)
      const variant = product.variants?.[0]
      const price = variant?.price ? Number(variant.price) : 0
      const imageUrl = product.images?.[0]?.src ?? undefined

      const rawCategory = product.categories?.[0]?.name
      const category = rawCategory ? extractLocalized(rawCategory) : undefined

      const rawDesc = product.description
      const desc = rawDesc ? extractLocalized(rawDesc as any) : undefined
      const description = desc ? desc.replace(/<[^>]*>/g, '').slice(0, 120) : undefined

      const totalStock = (product.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0)
      const salesCount = salesCounts.get(productId) ?? 0
      const marginPct = margins.get(productId)
      const costPrice = variant?.cost ? Number(variant.cost) : undefined
      const isRecent = product.created_at ? new Date(product.created_at) > thirtyDaysAgo : false

      const coProducts = coOccurrence.get(productId) ?? []
      const tag = suggestTag(
        salesCount,
        marginPct,
        totalStock,
        avgSales,
        isRecent,
        coProducts.length
      )

      return {
        product_id: String(productId),
        name,
        price,
        image_url: imageUrl,
        category,
        description,
        cost_price: costPrice && costPrice > 0 ? costPrice : undefined,
        stock_quantity: totalStock,
        sales_count: salesCount,
        margin_pct: marginPct != null ? Math.round(marginPct * 10) / 10 : undefined,
        frequently_bought_with: coProducts.map(String),
        suggested_tag: tag,
      }
    })

  enriched.sort((a, b) => {
    if (b.sales_count !== a.sales_count) return b.sales_count - a.sales_count
    const mA = a.margin_pct ?? -1
    const mB = b.margin_pct ?? -1
    if (mB !== mA) return mB - mA
    return a.stock_quantity - b.stock_quantity
  })

  console.log(
    `[product-analyzer] ${enriched.length} products enriched from ${orders.length} orders`
  )

  return enriched.slice(0, 50)
}

/* ========== prompt.ts ========== */

interface BrandDnaInput {
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

interface StoreInput {
  name?: string
}

interface ProductInput {
  name: string
  category?: string | null
  price: number
}

interface CalendarDate {
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

interface CalendarData {
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

const CALENDAR_SCHEMA: Record<string, unknown> = {
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

function buildCalendarSystemPrompt(input: {
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

function buildCalendarUserPrompt(input: { year: number; currentDate: Date }): string {
  const currentDateISO = input.currentDate.toISOString().split('T')[0]
  return `Gere o calendário sazonal personalizado para o ano ${input.year} com base no perfil da loja descrito acima. Data atual: ${currentDateISO}.`
}

/* ========== main handler ========== */

interface DispatchRequest {
  team_id: string
  task_id: string
  user_id: string
  input?: { year?: number; focus?: string }
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const expected = Deno.env.get('MCP_AUTH_TOKEN')
  if (!expected || !secret || secret !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: DispatchRequest
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.team_id || !body.task_id || !body.user_id) {
    return new Response('team_id, task_id, user_id required', { status: 400 })
  }

  // Run synchronously — waitUntil is unreliable for long Anthropic calls (>few seconds).
  // The caller should treat any 2xx as success; the task row is the source of truth.
  try {
    await runBackground(body)
  } catch (topErr) {
    const msg = topErr instanceof Error ? topErr.message : String(topErr)
    const stack = topErr instanceof Error ? (topErr.stack ?? '') : ''
    console.error('[handler] uncaught error:', msg, stack.slice(0, 300))
    return Response.json({ ok: false, error: msg, stack: stack.slice(0, 300) }, { status: 500 })
  }

  return Response.json(
    { ok: true, taskId: body.task_id, completed_at: new Date().toISOString() },
    { status: 200 }
  )
})

function coerceBrandDna(row: BrandDna | null): BrandDnaInput {
  const opportunities = Array.isArray(row?.opportunities)
    ? (row!.opportunities as Array<Record<string, unknown>>)
        .filter((o) => o && typeof o === 'object')
        .map((o) => ({
          title: String(o['title'] ?? ''),
          description: String(o['description'] ?? ''),
          estimated_revenue: Number(o['estimated_revenue'] ?? 0) || 0,
        }))
    : []
  return {
    niche: row?.niche ?? 'varejo geral',
    audience: row?.audience ?? 'consumidores brasileiros',
    positioning: row?.positioning ?? 'loja de e-commerce',
    tone: row?.tone ?? 'próximo e informativo',
    average_ticket: row?.average_ticket ?? 100,
    opportunities,
  }
}

async function runBackground(body: DispatchRequest): Promise<void> {
  const supabase = createServiceClient()
  const { team_id: teamId, task_id: taskId } = body
  const year = body.input?.year ?? new Date().getFullYear()

  log('generate-seasonal-calendar', { event: 'start', taskId, teamId, year })

  try {
    // 1. Mark running
    await supabase
      .from('tasks')
      .update({
        skill_status: 'running',
        active_skill: 'seasonal-calendar',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    log('generate-seasonal-calendar', { event: 'marked-running', taskId })

    // 2. Load context
    const [brandDnaRow, store] = await Promise.all([
      loadBrandDna(supabase, teamId),
      loadStoreForTeam(supabase, teamId),
    ])

    log('generate-seasonal-calendar', {
      event: 'after-load-context',
      taskId,
      brandDnaPresent: String(brandDnaRow !== null),
      storePresent: String(store !== null),
      storeName: store?.name ?? 'none',
    })

    // 3. Fetch products if store has platform token
    let products: NuvemProduct[] = []
    if (store?.platform_store_id && store?.platform_access_token) {
      try {
        products = await fetchProducts(store.platform_store_id, store.platform_access_token, {
          limit: 200,
        })
        log('generate-seasonal-calendar', {
          event: 'products-fetched',
          taskId,
          productsCount: products.length,
        })
      } catch (err) {
        log('generate-seasonal-calendar', {
          event: 'nuvemshop_fetch_failed',
          taskId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    } else {
      log('generate-seasonal-calendar', { event: 'no-store-token', taskId })
    }

    // 4. Analyze products (no orders in this MVP)
    const orders: NuvemOrderRaw[] = []
    const enriched = analyzeProducts(products as NuvemProductFull[], orders)

    // 5. Top 20 products for prompt
    const productSummary: ProductInput[] = enriched.slice(0, 20).map((p) => ({
      name: p.name,
      category: p.category ?? null,
      price: p.price,
    }))

    // 6. Build prompts
    const brandDna = coerceBrandDna(brandDnaRow)
    const currentDate = new Date()
    const system = buildCalendarSystemPrompt({
      brandDna,
      store: store ? { name: store.name } : undefined,
      products: productSummary,
      year,
      currentDate,
    })
    const userPrompt = buildCalendarUserPrompt({ year, currentDate })

    log('generate-seasonal-calendar', {
      event: 'before-anthropic-call',
      taskId,
      year,
      productSummaryCount: productSummary.length,
      brandDnaNiche: brandDna.niche,
    })

    // 7. Generate structured calendar
    const calendar = await generateObject<CalendarData>({
      model: 'claude-sonnet-4-6',
      system,
      prompt: userPrompt,
      schema: CALENDAR_SCHEMA,
      schemaName: 'emit_seasonal_calendar',
      maxTokens: 16384,
    })

    const datesCount = (calendar as { dates?: unknown[] }).dates?.length ?? 0
    log('generate-seasonal-calendar', { event: 'after-anthropic-call', taskId, datesCount })

    // 8. Persist final artifact
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        artifact_data: calendar as any,
        artifact_type: 'seasonal-calendar',
        skill_status: 'completed',
        active_skill: 'seasonal-calendar',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (updateError) {
      log('generate-seasonal-calendar', {
        event: 'db-update-error',
        taskId,
        error: JSON.stringify(updateError),
      })
      throw new Error(`DB update failed: ${JSON.stringify(updateError)}`)
    }

    log('generate-seasonal-calendar', { event: 'written-to-db', taskId, datesCount })
    log('generate-seasonal-calendar', { event: 'completed', taskId, datesCount })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? (err.stack ?? '') : ''
    log('generate-seasonal-calendar', {
      event: 'failed',
      taskId,
      error: msg,
      stack: stack.slice(0, 500),
    })
    await failTask(supabase, taskId, 'generate', msg)
    throw err // rethrow so handler can surface the error in the response
  }
}
