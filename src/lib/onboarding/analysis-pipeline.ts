import { createServiceRoleClient } from '@/lib/supabase/server'
import { summarizeCatalog } from '@/lib/retail/catalog-summarizer'
import { analyzeBrandDna, type BrandDnaResult } from '@/lib/ai/brand-dna-analyzer'
import { createLogger } from '@/lib/logger'

const log = createLogger('onboarding/analysis-pipeline')

export type PipelineStep = {
  step: number
  status: 'running' | 'completed' | 'error'
  message: string
  count?: number
}

export type ProgressCallback = (update: PipelineStep) => void

// brand_dna is not yet in generated types — use a typed helper
type BrandDnaRow = { id: string }
type BrandDnaDb = {
  from: (table: 'brand_dna') => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string
      ) => {
        single: () => Promise<{ data: BrandDnaRow | null; error: { message: string } | null }>
      }
    }
    update: (data: Record<string, unknown>) => {
      eq: (
        col: string,
        val: string
      ) => {
        select: (cols: string) => {
          single: () => Promise<{ data: BrandDnaRow | null; error: { message: string } | null }>
        }
      }
    }
    insert: (data: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{ data: BrandDnaRow | null; error: { message: string } | null }>
      }
    }
  }
}

export async function runAnalysisPipeline(
  storeId: string,
  teamId: string,
  onProgress: ProgressCallback,
  userId?: string
): Promise<{ brandDnaId: string }> {
  const supabase = createServiceRoleClient()

  // Step 1: Fetch products from API (no DB sync — products are fetched live when needed)
  onProgress({ step: 1, status: 'running', message: 'Buscando produtos da loja...' })

  let liveProductCount = 0
  try {
    const { data: store } = await supabase
      .from('stores')
      .select('platform, platform_access_token, platform_store_id')
      .eq('id', storeId)
      .single()

    if (!store) throw new Error('Store not found')

    if (store.platform === 'nuvemshop' && store.platform_access_token && store.platform_store_id) {
      const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
      const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
      const products = await client.getProducts(1, 200)
      liveProductCount = products.length
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar produtos'
    onProgress({ step: 1, status: 'error', message })
    throw err
  }

  onProgress({
    step: 1,
    status: 'completed',
    message: `${liveProductCount} produtos encontrados`,
    count: liveProductCount,
  })

  // Step 2: Visual analysis (screenshot + GPT vision)
  onProgress({ step: 2, status: 'running', message: 'Analisando identidade visual...' })

  type VisualAnalysis = {
    color_palette: Array<{ hex: string; label: string }>
    palette_description: string
    visual_style: string
    logo_description: string | null
    fonts: Array<{ name: string; usage: string; category: string }>
    brand_texts: Array<{ type: string; label: string; content: string }>
  }
  let visualAnalysis: VisualAnalysis | null = null

  try {
    const { data: storeForVisual } = await supabase
      .from('stores')
      .select('platform, platform_store_id, platform_access_token')
      .eq('id', storeId)
      .single()

    if (
      storeForVisual?.platform === 'nuvemshop' &&
      storeForVisual.platform_access_token &&
      storeForVisual.platform_store_id
    ) {
      const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
      const nuvemshop = new NuvemshopClient(
        storeForVisual.platform_store_id,
        storeForVisual.platform_access_token
      )
      const nsStore = await nuvemshop.getStoreInfo()
      const storeUrl =
        nsStore.domains?.length > 0
          ? `https://${nsStore.domains[0]}`
          : `https://${nsStore.original_domain}`

      const { analyzeStoreVisuals } = await import('@/lib/ai/store-visual-analyzer')
      visualAnalysis = await analyzeStoreVisuals(storeUrl)
    }
  } catch (err) {
    log.warn({ err }, 'Visual analysis failed (non-blocking)')
  }

  onProgress({
    step: 2,
    status: 'completed',
    message: visualAnalysis ? 'Identidade visual capturada' : 'Identidade visual indisponível',
  })

  // Step 3: Analyze catalog + generate Brand DNA
  onProgress({ step: 3, status: 'running', message: 'Gerando Brand DNA...' })

  let brandDnaResult: BrandDnaResult
  let storeName = ''
  let storePlatform = ''
  let ownerName = ''

  try {
    const { data: storeInfo } = await supabase
      .from('stores')
      .select('name, segment, platform, platform_store_id, platform_access_token')
      .eq('id', storeId)
      .single()

    // Fetch products live from Nuvemshop API (not from DB cache)
    let products: Array<{ name: string; price: number }> = []
    if (
      storeInfo?.platform === 'nuvemshop' &&
      storeInfo.platform_store_id &&
      storeInfo.platform_access_token
    ) {
      const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
      const nuvemshop = new NuvemshopClient(
        storeInfo.platform_store_id,
        storeInfo.platform_access_token
      )
      const liveProducts = await nuvemshop.getProducts(1, 200)
      products = liveProducts.map((p) => ({
        name:
          typeof p.name === 'object'
            ? ((p.name as Record<string, string>).pt ??
              Object.values(p.name as Record<string, string>)[0] ??
              '')
            : String(p.name),
        price: p.variants?.[0]?.price ? Number(p.variants[0].price) : 0,
      }))
    } else {
      // Fallback to DB for non-Nuvemshop stores
      const { data: dbProducts } = await supabase
        .from('store_products')
        .select('name, price')
        .eq('store_id', storeId)
      products = (dbProducts ?? []).map((p) => ({ name: p.name, price: p.price ?? 0 }))
    }

    storeName = storeInfo?.name ?? ''
    storePlatform = storeInfo?.platform ?? ''

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()
      ownerName = profile?.full_name ?? ''
    }

    const summary = summarizeCatalog(
      (products ?? []).map((p) => ({
        name: p.name,
        description: null,
        price: p.price,
        category: null,
      }))
    )

    brandDnaResult = await analyzeBrandDna(summary, {
      name: storeName,
      segment: storeInfo?.segment ?? '',
      platform: storePlatform,
      ownerName,
      visualAnalysis,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar Brand DNA'
    onProgress({ step: 3, status: 'error', message })
    throw err
  }

  onProgress({ step: 3, status: 'completed', message: 'Brand DNA gerado' })

  // Step 4: Save Brand DNA
  onProgress({ step: 4, status: 'running', message: 'Mapeando oportunidades sazonais...' })

  let brandDnaId: string

  try {
    // brand_dna table is not in generated types yet — cast through unknown
    const db = supabase as unknown as BrandDnaDb

    const { data: existing } = await db
      .from('brand_dna')
      .select('id')
      .eq('team_id', teamId)
      .single()

    if (existing) {
      const { data: updated, error } = await db
        .from('brand_dna')
        .update({
          store_name: storeName,
          niche: brandDnaResult.niche,
          average_ticket: brandDnaResult.average_ticket,
          tone: brandDnaResult.tone,
          audience: brandDnaResult.audience,
          words_to_use: brandDnaResult.words_to_use,
          words_to_avoid: brandDnaResult.words_to_avoid,
          positioning: brandDnaResult.positioning,
          strengths: brandDnaResult.strengths,
          alerts: brandDnaResult.alerts,
          opportunities: brandDnaResult.opportunities,
          revenue_projection: brandDnaResult.revenue_projection,
          owner_name: ownerName,
          greeting: brandDnaResult.greeting,
          intro: brandDnaResult.intro,
          color_palette: brandDnaResult.color_palette,
          palette_description: brandDnaResult.palette_description,
          fonts: brandDnaResult.fonts,
          brand_texts: brandDnaResult.brand_texts,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', teamId)
        .select('id')
        .single()

      if (error) throw new Error(error.message)
      if (!updated) throw new Error('Failed to update brand_dna')
      brandDnaId = updated.id
    } else {
      const { data: inserted, error } = await db
        .from('brand_dna')
        .insert({
          team_id: teamId,
          store_name: storeName,
          niche: brandDnaResult.niche,
          average_ticket: brandDnaResult.average_ticket,
          platform: storePlatform,
          tone: brandDnaResult.tone,
          audience: brandDnaResult.audience,
          words_to_use: brandDnaResult.words_to_use,
          words_to_avoid: brandDnaResult.words_to_avoid,
          positioning: brandDnaResult.positioning,
          strengths: brandDnaResult.strengths,
          alerts: brandDnaResult.alerts,
          opportunities: brandDnaResult.opportunities,
          revenue_projection: brandDnaResult.revenue_projection,
          owner_name: ownerName,
          greeting: brandDnaResult.greeting,
          intro: brandDnaResult.intro,
          color_palette: brandDnaResult.color_palette,
          palette_description: brandDnaResult.palette_description,
          fonts: brandDnaResult.fonts,
          brand_texts: brandDnaResult.brand_texts,
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)
      if (!inserted) throw new Error('Failed to insert brand_dna')
      brandDnaId = inserted.id
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar Brand DNA'
    onProgress({ step: 4, status: 'error', message })
    throw err
  }

  const opportunityCount = Array.isArray(brandDnaResult.opportunities)
    ? brandDnaResult.opportunities.length
    : 0

  onProgress({
    step: 4,
    status: 'completed',
    message: `${opportunityCount} oportunidades mapeadas`,
    count: opportunityCount,
  })

  // If agent already exists, update its system prompt with the new brand DNA
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: team } = await (supabase as any)
      .from('teams')
      .select('anthropic_agent_id')
      .eq('id', teamId)
      .single()
    if (team?.anthropic_agent_id) {
      const { getAnthropicClient } = await import('@/lib/anthropic')
      const { buildOrchestratorSystemPrompt } = await import('@/lib/ai/platform-tools')
      const anthropic = getAnthropicClient()
      const currentAgent = await anthropic.beta.agents.retrieve(team.anthropic_agent_id)

      // Rebuild prompt with fresh brand DNA
      const [{ data: skills }, { data: store }] = await Promise.all([
        supabase
          .from('skills' as never)
          .select('slug, name, description, category, status')
          .eq('team_id' as never, teamId)
          .order('name' as never),
        supabase
          .from('stores')
          .select('name, segment, platform')
          .eq('team_id', teamId)
          .limit(1)
          .single(),
      ])
      const prompt = buildOrchestratorSystemPrompt(
        store?.name ?? 'Workspace',
        (skills as Array<{
          slug: string
          name: string
          description: string | null
          category: string
          status: string
        }>) ?? [],
        store
          ? {
              storeName: store.name,
              segment: store.segment ?? '',
              platform: store.platform,
              hasProducts: true,
            }
          : undefined,
        brandDnaResult as unknown as {
          niche: string
          tone: string
          audience: string
          positioning: string
          words_to_use: string[]
          words_to_avoid: string[]
          store_name: string | null
        },
        'full'
      )
      await anthropic.beta.agents.update(team.anthropic_agent_id, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        version: (currentAgent as any).version,
        system: prompt,
      })
    }
  } catch {
    // Non-blocking — agent prompt will be stale until next provision
  }

  return { brandDnaId }
}
