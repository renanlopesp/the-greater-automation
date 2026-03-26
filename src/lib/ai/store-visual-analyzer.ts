import { generateObject } from 'ai'
import { z } from 'zod'
import { getOpenAIProvider } from '@/lib/ai/agent-chat'

export interface VisualAnalysis {
  color_palette: Array<{ hex: string; label: string }>
  palette_description: string
  visual_style: string
  logo_description: string | null
}

const VisualAnalysisSchema = z.object({
  color_palette: z
    .array(
      z.object({
        hex: z.string().describe('Codigo hex da cor exata (ex: #1A2B3C)'),
        label: z.string().describe('Nome descritivo curto da cor em PT-BR (ex: Azul marinho)'),
      })
    )
    .min(3)
    .max(6)
    .describe(
      'Cores predominantes extraidas do layout, header, botoes, backgrounds e logo da loja'
    ),
  palette_description: z
    .string()
    .describe('Descricao curta da paleta em PT-BR (ex: Paleta vibrante e jovem. Energia urbana.)'),
  visual_style: z
    .string()
    .describe(
      'Descricao do estilo visual geral: minimalista, colorido, premium, rustico, moderno, etc.'
    ),
  logo_description: z
    .string()
    .nullable()
    .describe('Breve descricao do logo se visivel no screenshot, ou null se nao encontrado'),
})

/**
 * Takes a screenshot of the store homepage via Firecrawl and analyzes
 * the visual identity (colors, style, logo) using GPT vision.
 *
 * Returns null if screenshot capture or analysis fails (non-blocking).
 */
export async function analyzeStoreVisuals(storeUrl: string): Promise<VisualAnalysis | null> {
  // Step 1: Capture screenshot via Firecrawl (dynamic import to avoid module-level issues)
  let screenshotUrl: string
  try {
    const { createFirecrawlClient } = await import('@/lib/workflow-editor/web-scraping-executor')
    const firecrawl = createFirecrawlClient()
    const result = await firecrawl.scrapeUrl(storeUrl, {
      formats: ['screenshot'],
      waitFor: 3000,
    })

    if (!result.success || !result.screenshot) {
      console.warn('[store-visual-analyzer] Screenshot capture failed for', storeUrl)
      return null
    }

    screenshotUrl = result.screenshot
  } catch (err) {
    console.warn('[store-visual-analyzer] Firecrawl error:', err)
    return null
  }

  // Step 2: Analyze screenshot with GPT vision
  try {
    const openai = getOpenAIProvider()

    const { object } = await generateObject({
      model: openai.responses('gpt-5.2'),
      schema: VisualAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise este screenshot da homepage de uma loja virtual brasileira (${storeUrl}).

Extraia:
1. As cores EXATAS predominantes do layout — header, botoes, backgrounds, textos, logo, banners. Use os codigos hex reais que voce observa, nao invente cores.
2. Uma descricao curta e impactante da paleta (personalidade visual).
3. O estilo visual geral da loja.
4. Descricao do logo se visivel.

IMPORTANTE: Extraia as cores REAIS que voce ve no screenshot. Nao use cores genericas ou padrao.`,
            },
            {
              type: 'image',
              image: screenshotUrl,
            },
          ],
        },
      ],
    })

    return object
  } catch (err) {
    console.warn('[store-visual-analyzer] Vision analysis error:', err)
    return null
  }
}
