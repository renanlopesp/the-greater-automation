import { generateObject } from 'ai'
import { z } from 'zod'
import { getOpenAIProvider } from '@/lib/ai/agent-chat'
import type { CampaignProduct } from '@/data/campaign-data'

interface AssetConfig {
  label: string
  ratio: string
  width: number
  height: number
}

const ASSET_FORMATS: AssetConfig[] = [
  { label: 'Stories 9:16', ratio: '9:16', width: 1080, height: 1920 },
  { label: 'Feed 1:1', ratio: '1:1', width: 1080, height: 1080 },
  { label: 'Banner Email 3:1', ratio: '3:1', width: 1200, height: 400 },
  { label: 'Stories Meta Ad 9:16', ratio: '9:16', width: 1080, height: 1920 },
]

export interface GeneratedAsset {
  label: string
  ratio: string
  html: string
  width: number
  height: number
  product_name: string
}

const AssetTemplateSchema = z.object({
  headline: z.string().describe('Texto principal em destaque (max 8 palavras)'),
  subtext: z.string().describe('Texto secundário curto (max 15 palavras)'),
  cta: z.string().describe('Texto do botão CTA (max 4 palavras)'),
  overlayColor: z
    .string()
    .describe(
      'Cor do overlay semi-transparente sobre a imagem (ex: rgba(0,0,0,0.45), rgba(139,90,43,0.5))'
    ),
  textColor: z.string().describe('Cor do texto (ex: #ffffff, #f5f0e8)'),
  ctaBgColor: z.string().describe('Cor de fundo do botão CTA (ex: rgba(180,130,70,0.8))'),
})

/**
 * Generate campaign visual assets as HTML/CSS templates.
 * Generates one asset per product per format — each product gets its own background image.
 * Download converts to image via html2canvas on the client.
 */
export async function generateAssets(params: {
  campaignSlogan: string
  dateName: string
  products: CampaignProduct[]
  brandDna: {
    niche: string
    tone: string
    positioning: string
  }
}): Promise<GeneratedAsset[]> {
  const openai = getOpenAIProvider()
  const { campaignSlogan, dateName, products, brandDna } = params

  // Filter to products with images only
  const productsWithImages = products.filter((p) => p.image_url)
  if (productsWithImages.length === 0) return []

  const productNames = productsWithImages.map((p) => p.name)

  // Generate text content per format — one AI call per format, batch all products
  const allAssets: GeneratedAsset[] = []

  for (const format of ASSET_FORMATS) {
    const { object: textContent } = await generateObject({
      model: openai.chat('gpt-4o'),
      schema: z.object({
        assets: z.array(AssetTemplateSchema).length(productsWithImages.length),
      }),
      system: `Você é um designer de marketing para e-commerce brasileiro. Gere textos para ${productsWithImages.length} assets visuais no formato "${format.label}" (${format.ratio}) de uma campanha sazonal.

CAMPANHA: ${dateName}
SLOGAN: "${campaignSlogan}"
NICHO: ${brandDna.niche}
TOM: ${brandDna.tone}

PRODUTOS (gere 1 asset para cada, na mesma ordem):
${productNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Para CADA produto, gere:
- headline curto e impactante (max 8 palavras) que destaque o produto
- subtexto complementar (max 15 palavras)
- CTA (max 4 palavras)
- cores do overlay que combinem com o nicho "${brandDna.niche}"

Os textos devem estar em Português do Brasil.
Retorne exatamente ${productsWithImages.length} itens no array, um para cada produto.`,
      messages: [
        {
          role: 'user',
          content: `Gere os textos para ${productsWithImages.length} assets "${format.label}" da campanha "${dateName}".`,
        },
      ],
    })

    // Build HTML for each product in this format
    for (let i = 0; i < productsWithImages.length; i++) {
      const product = productsWithImages[i]
      const text = textContent.assets[i]
      if (!text) continue

      allAssets.push({
        label: format.label,
        ratio: format.ratio,
        width: format.width,
        height: format.height,
        product_name: product.name,
        html: buildAssetHtml({
          format,
          bgImage: product.image_url ?? '',
          headline: text.headline,
          subtext: text.subtext,
          cta: text.cta,
          overlayColor: text.overlayColor,
          textColor: text.textColor,
          ctaBgColor: text.ctaBgColor,
        }),
      })
    }
  }

  return allAssets
}

function buildAssetHtml(params: {
  format: AssetConfig
  bgImage: string
  headline: string
  subtext: string
  cta: string
  overlayColor: string
  textColor: string
  ctaBgColor: string
}): string {
  const { format, bgImage, headline, subtext, cta, overlayColor, textColor, ctaBgColor } = params
  const isVertical = format.ratio === '9:16'
  const isWide = format.ratio === '3:1'

  const headlineSize = isWide ? '32px' : isVertical ? '48px' : '40px'
  const subtextSize = isWide ? '18px' : '20px'
  const ctaSize = isWide ? '15px' : '17px'
  const ctaPadding = isWide ? '12px 28px' : '16px 36px'

  return `<div style="
    position: relative;
    width: ${format.width}px;
    height: ${format.height}px;
    overflow: hidden;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  ">
    <img src="${bgImage}" style="
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    " crossorigin="anonymous" />
    <div style="
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      background: ${overlayColor};
    "></div>
    <div style="
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: ${isWide ? 'center' : 'flex-end'};
      align-items: center;
      padding: ${isWide ? '20px 40px' : '60px 40px'};
      box-sizing: border-box;
      text-align: center;
    ">
      <h1 style="
        color: ${textColor};
        font-size: ${headlineSize};
        font-weight: 800;
        line-height: 1.1;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        margin: 0 0 ${isWide ? '8px' : '16px'} 0;
        text-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${headline}</h1>
      <p style="
        color: ${textColor};
        font-size: ${subtextSize};
        font-weight: 400;
        line-height: 1.4;
        margin: 0 0 ${isWide ? '12px' : '24px'} 0;
        max-width: ${isWide ? '500px' : '380px'};
        text-shadow: 0 1px 4px rgba(0,0,0,0.3);
      ">${subtext}</p>
      <a style="
        display: inline-block;
        background: ${ctaBgColor};
        color: ${textColor};
        font-size: ${ctaSize};
        font-weight: 600;
        padding: ${ctaPadding};
        border-radius: 4px;
        text-decoration: none;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: ${isWide ? '0' : '40px'};
      ">${cta}</a>
    </div>
  </div>`
}
