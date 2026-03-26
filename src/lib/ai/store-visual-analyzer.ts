import { generateObject } from 'ai'
import { z } from 'zod'
import { getOpenAIProvider } from '@/lib/ai/agent-chat'

export interface VisualAnalysis {
  color_palette: Array<{ hex: string; label: string }>
  palette_description: string
  visual_style: string
  logo_description: string | null
  fonts: Array<{ name: string; usage: string; category: string }>
  brand_texts: Array<{ type: string; label: string; content: string }>
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
  fonts: z
    .array(
      z.object({
        name: z
          .string()
          .describe('Nome da fonte detectada (ex: Cormorant Garamond, Inter, Roboto)'),
        usage: z
          .string()
          .describe('Onde a fonte e usada em PT-BR (ex: Titulos e headings, Corpo e UI)'),
        category: z.enum(['serif', 'sans-serif', 'monospace', 'display', 'handwriting']),
      })
    )
    .min(1)
    .max(3)
    .describe('Fontes detectadas no layout da loja (headings, corpo, UI)'),
  brand_texts: z
    .array(
      z.object({
        type: z.enum(['slogan', 'bio', 'signature', 'tagline', 'description']),
        label: z
          .string()
          .describe('Label em PT-BR uppercase (ex: SLOGAN, BIO INSTAGRAM, ASSINATURA E-MAIL)'),
        content: z.string().describe('Texto exato encontrado no site'),
      })
    )
    .max(5)
    .describe('Textos de marca encontrados no screenshot: slogan, tagline, descricao de destaque'),
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
5. FONTES: Identifique as fontes usadas no site (heading, corpo, UI). Se nao conseguir identificar o nome exato, de o melhor palpite baseado no estilo visual (serif, sans-serif, etc.).
6. TEXTOS DE MARCA: Extraia APENAS textos de destaque da marca — slogan, tagline, frase de impacto, proposta de valor. NAO inclua itens de menu (Inicio, Produtos, Contato), nomes de categorias, precos ou textos genéricos de navegacao. Foque em frases que expressam a identidade e posicionamento da marca. Se nao houver textos de marca claros, retorne array vazio.

IMPORTANTE: Extraia as cores REAIS e fontes REAIS que voce ve no screenshot. Nao use valores genericos ou padrao.`,
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
