import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { type CatalogSummary, formatCatalogForLLM } from '@/lib/retail/catalog-summarizer'

export interface StoreInfo {
  name: string
  segment: string
  platform: string
  ownerName: string
  visualAnalysis?: {
    color_palette: Array<{ hex: string; label: string }>
    palette_description: string
    visual_style: string
    logo_description: string | null
    fonts: Array<{ name: string; usage: string; category: string }>
    brand_texts: Array<{ type: string; label: string; content: string }>
  } | null
}

export interface BrandDnaResult {
  niche: string
  average_ticket: number
  tone: string
  audience: string
  positioning: string
  words_to_use: string[]
  words_to_avoid: string[]
  strengths: Array<{ title: string; description: string }>
  alerts: Array<{ title: string; description: string }>
  opportunities: Array<{
    title: string
    description: string
    estimated_revenue: number
    color: 'green' | 'amber'
  }>
  revenue_projection: {
    current: number
    projected: number
    delta: number
    disclaimer: string
  }
  recommended_skills: Array<{ slug: string; reason: string }>
  color_palette: Array<{ hex: string; label: string }>
  palette_description: string
  fonts: Array<{ name: string; usage: string; category: string }>
  brand_texts: Array<{ type: string; label: string; content: string }>
  greeting: string
  intro: string
}

const BrandDnaSchema = z.object({
  niche: z.string(),
  average_ticket: z.number(),
  tone: z.string(),
  audience: z.string(),
  positioning: z.string(),
  words_to_use: z.array(z.string()).min(3).max(10),
  words_to_avoid: z.array(z.string()).min(3).max(10),
  strengths: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .min(2)
    .max(5),
  alerts: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .min(1)
    .max(4),
  opportunities: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        estimated_revenue: z.number(),
        color: z.enum(['green', 'amber']),
      })
    )
    .min(2)
    .max(5),
  revenue_projection: z.object({
    current: z.number(),
    projected: z.number(),
    delta: z.number(),
    disclaimer: z.string(),
  }),
  recommended_skills: z
    .array(z.object({ slug: z.string(), reason: z.string() }))
    .min(3)
    .max(3),
  color_palette: z
    .array(z.object({ hex: z.string(), label: z.string() }))
    .min(3)
    .max(6),
  palette_description: z.string(),
  fonts: z
    .array(z.object({ name: z.string(), usage: z.string(), category: z.string() }))
    .min(1)
    .max(3),
  brand_texts: z
    .array(z.object({ type: z.string(), label: z.string(), content: z.string() }))
    .max(5),
  greeting: z.string(),
  intro: z.string(),
})

/**
 * Calls the Managed Agent to generate Brand DNA analysis from a catalog summary.
 * The Agent already has store context, product catalog, and brand positioning
 * via its system prompt and MCP tools.
 *
 * All output text is in Portuguese (PT-BR).
 */
export async function analyzeBrandDna(
  summary: CatalogSummary,
  storeInfo: StoreInfo
): Promise<BrandDnaResult> {
  const formattedCatalog = formatCatalogForLLM(summary)

  const visualContext = storeInfo.visualAnalysis
    ? `
ANÁLISE VISUAL DA LOJA (extraída via screenshot real do site):
- Estilo visual: ${storeInfo.visualAnalysis.visual_style}
- Paleta detectada: ${storeInfo.visualAnalysis.color_palette.map((c) => `${c.hex} (${c.label})`).join(', ')}
- Descrição da paleta: ${storeInfo.visualAnalysis.palette_description}
${storeInfo.visualAnalysis.logo_description ? `- Logo: ${storeInfo.visualAnalysis.logo_description}` : ''}
Fontes detectadas: ${storeInfo.visualAnalysis.fonts.map((f) => `${f.name} (${f.usage})`).join(', ')}
${storeInfo.visualAnalysis.brand_texts.length > 0 ? `Textos de marca detectados:\n${storeInfo.visualAnalysis.brand_texts.map((t) => `- ${t.label}: ${t.content}`).join('\n')}` : ''}`
    : ''

  const prompt = `Analise o Brand DNA completo da loja "${storeInfo.name}" (plataforma: ${storeInfo.platform}, segmento: ${storeInfo.segment}, dono(a): ${storeInfo.ownerName}).

${visualContext}

CATÁLOGO DE PRODUTOS:
${formattedCatalog}

GERE UMA ANÁLISE ESTRATÉGICA COMPLETA incluindo:
- niche: nicho específico (não genérico)
- average_ticket: ticket médio estimado em reais
- tone: tom de comunicação da marca
- audience: público-alvo com perfil detalhado
- positioning: posicionamento de mercado
- words_to_use: 3-10 palavras alinhadas com a marca
- words_to_avoid: 3-10 palavras que não combinam
- strengths: 2-5 pontos fortes do catálogo
- alerts: 1-4 alertas e pontos de atenção
- opportunities: 2-5 oportunidades sazonais com estimated_revenue e color (green/amber)
- revenue_projection: { current, projected, delta (%), disclaimer }
- recommended_skills: exatamente 3 slugs de: seasonal-calendar, campaign-copywriter, campaign-engine, image-generator, social-asset-creator, video-script-creator, revenue-intelligence, funnel-diagnostics, conversion-optimizer, brand-dna-agent
- color_palette: 3-6 cores com hex e label PT-BR (use as da análise visual se disponíveis)
- palette_description: frase curta sobre a paleta
- fonts: 1-3 fontes com name, usage PT-BR, category
- brand_texts: textos de marca (slogan, bio, assinatura) com type, label uppercase PT-BR, content
- greeting: exatamente "Oi, ${storeInfo.ownerName}. Sou o Snew, seu novo CMO."
- intro: 2-3 frases resumindo insights, mencionando a loja pelo nome

Toda a saída em Português do Brasil. Seja específico e use dados reais do catálogo.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No explanation, no markdown code blocks, just the raw JSON object.`,
      },
    ],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
  if (!jsonMatch) throw new Error('No JSON in brand DNA response')

  const parsed = JSON.parse(jsonMatch[0])
  const result = BrandDnaSchema.safeParse(parsed)
  if (result.success) return result.data
  // Lenient: return raw parsed if close enough
  return parsed as BrandDnaResult
}
