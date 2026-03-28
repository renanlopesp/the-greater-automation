import { generateObject } from 'ai'
import { z } from 'zod'
import { getOpenAIProvider } from '@/lib/ai/agent-chat'
import { createLogger } from '@/lib/logger'

const log = createLogger('ai/store-visual-analyzer')

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
/**
 * Extract font names from raw HTML by looking at Google Fonts links,
 * @font-face declarations, and font-family CSS properties.
 */
function extractFontsFromHtml(html: string): string[] {
  const fonts = new Set<string>()

  // Google Fonts links: fonts.googleapis.com/css?family=Font+Name or css2?family=Font+Name
  const googleFontsRe = /fonts\.googleapis\.com\/css2?\?[^"']*family=([^&"']+)/g
  let match
  while ((match = googleFontsRe.exec(html)) !== null) {
    const families = decodeURIComponent(match[1]).split('|')
    for (const f of families) {
      const name = f.split(':')[0].replace(/\+/g, ' ').trim()
      if (name) fonts.add(name)
    }
  }

  // @font-face { font-family: "Font Name" }
  const fontFaceRe = /font-family:\s*['"]([^'"]+)['"]/g
  while ((match = fontFaceRe.exec(html)) !== null) {
    const name = match[1].trim()
    if (
      name &&
      !['inherit', 'initial', 'unset', 'sans-serif', 'serif', 'monospace'].includes(
        name.toLowerCase()
      )
    ) {
      fonts.add(name)
    }
  }

  return Array.from(fonts).slice(0, 5)
}

export async function analyzeStoreVisuals(storeUrl: string): Promise<VisualAnalysis | null> {
  // Step 1: Capture screenshot + HTML via Firecrawl
  let screenshotUrl: string
  let extractedFonts: string[] = []
  try {
    const { createFirecrawlClient } = await import('@/lib/workflow-editor/web-scraping-executor')
    const firecrawl = createFirecrawlClient()
    const result = await firecrawl.scrapeUrl(storeUrl, {
      formats: ['screenshot', 'rawHtml'],
      waitFor: 3000,
    })

    if (!result.success || !result.screenshot) {
      log.warn({ storeUrl }, 'Screenshot capture failed')
      return null
    }

    screenshotUrl = result.screenshot

    // Extract fonts from HTML
    if (result.rawHtml) {
      extractedFonts = extractFontsFromHtml(result.rawHtml)
    }
  } catch (err) {
    log.warn({ err }, 'Firecrawl error')
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
5. FONTES: ${extractedFonts.length > 0 ? `As seguintes fontes foram detectadas no HTML/CSS do site: ${extractedFonts.join(', ')}. Use EXATAMENTE esses nomes. Determine qual e usada para headings e qual para corpo/UI baseado no screenshot.` : 'Identifique as fontes usadas no site (heading, corpo, UI). Se nao conseguir identificar o nome exato, de o melhor palpite baseado no estilo visual.'}
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
    log.warn({ err }, 'Vision analysis error')
    return null
  }
}
