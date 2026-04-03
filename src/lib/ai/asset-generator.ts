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
  headline: z.string().describe('Frase de campanha curta e impactante (max 6 palavras)'),
  subtext: z.string().describe('Complemento curto da campanha (max 12 palavras)'),
  cta: z.string().describe('Texto do botão CTA (max 3 palavras): ex "Comprar Agora", "Ver Mais"'),
  gradientColor: z
    .string()
    .describe(
      'Cor base do gradiente inferior (tom que combine com o nicho, ex: rgba(26,26,26,0.85), rgba(90,60,30,0.8), rgba(180,140,100,0.75))'
    ),
  accentColor: z
    .string()
    .describe('Cor de destaque para o CTA (ex: #c9a96e, #e8b4b8, #7fb069, #4a90d9)'),
})

/**
 * Generate campaign visual assets — full-bleed product image with modern overlay.
 * Each product gets its own asset per format.
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

  const productsWithImages = products.filter((p) => p.image_url)
  if (productsWithImages.length === 0) return []

  const productList = productsWithImages.map((p) => p.name).join('\n')

  const formatResults = await Promise.all(
    ASSET_FORMATS.map(async (format) => {
      const { object: textContent } = await generateObject({
        model: openai.chat('gpt-4o'),
        schema: z.object({
          assets: z
            .array(AssetTemplateSchema)
            .min(1)
            .describe(`Gere exatamente ${productsWithImages.length} itens, um para cada produto`),
        }),
        system: `Você é um designer de social media premium para e-commerce brasileiro. Crie textos para ${productsWithImages.length} assets de CAMPANHA no formato "${format.label}" (${format.ratio}).

CAMPANHA: ${dateName}
SLOGAN: "${campaignSlogan}"
NICHO: ${brandDna.niche}
TOM: ${brandDna.tone}

PRODUTOS (1 asset por produto — a foto do produto ocupa o fundo inteiro):
${productList}

ESTILO: Asset de CAMPANHA promocional (NÃO é página de produto).
- A foto do produto preenche todo o fundo
- Gradiente moderno de baixo para cima sobre a foto
- Texto centralizado sobre o gradiente
- Headlines de campanha, não nome de produto (ex: "Conforto que Abraça", "Primeiro Enxoval")
- CTA curto: "Comprar Agora", "Ver Coleção", "Descubra"
- gradientColor: use tons que combinem com o nicho
  - Bebê/infantil: rgba(180,150,120,0.8), rgba(160,130,100,0.75)
  - Moda: rgba(30,30,30,0.8), rgba(50,40,30,0.75)
  - Tech: rgba(20,20,40,0.85)
- accentColor: cor vibrante para o botão CTA

Retorne exatamente ${productsWithImages.length} itens. Português do Brasil.`,
        messages: [
          {
            role: 'user',
            content: `Gere os textos para ${productsWithImages.length} assets "${format.label}" da campanha "${dateName}".`,
          },
        ],
      })

      const assets: GeneratedAsset[] = []
      for (let i = 0; i < productsWithImages.length; i++) {
        const product = productsWithImages[i]
        const text = textContent.assets[i]
        if (!text) continue

        assets.push({
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
            gradientColor: text.gradientColor,
            accentColor: text.accentColor,
          }),
        })
      }
      return assets
    })
  )

  return formatResults.flat()
}

function buildAssetHtml(params: {
  format: AssetConfig
  bgImage: string
  headline: string
  subtext: string
  cta: string
  gradientColor: string
  accentColor: string
}): string {
  const { format, bgImage, headline, subtext, cta, gradientColor, accentColor } = params
  const isVertical = format.ratio === '9:16'
  const isWide = format.ratio === '3:1'

  // Gradient covers bottom portion for text readability
  const gradientHeight = isWide ? '100%' : isVertical ? '60%' : '55%'

  const headlineSize = isWide ? '36px' : isVertical ? '56px' : '44px'
  const subtextSize = isWide ? '16px' : isVertical ? '24px' : '20px'
  const ctaSize = isWide ? '14px' : isVertical ? '18px' : '16px'
  const ctaPadding = isWide ? '12px 32px' : isVertical ? '18px 48px' : '16px 40px'
  const contentPadding = isWide ? '24px 48px' : isVertical ? '0 60px 140px' : '0 48px 80px'
  const gap = isWide ? '12px' : isVertical ? '28px' : '20px'

  return `<div style="
    position: relative;
    width: ${format.width}px;
    height: ${format.height}px;
    overflow: hidden;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background-image: url('${bgImage}');
    background-size: cover;
    background-position: center;
  ">
    <!-- Modern gradient overlay from bottom -->
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: ${gradientHeight};
      background: linear-gradient(to top, ${gradientColor}, ${gradientColor.replace(/[\d.]+\)$/, '0.4)')}, transparent);
    "></div>

    <!-- Content centered at bottom (no flexbox — html2canvas compatible) -->
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      ${isWide ? 'top: 0;' : ''}
      padding: ${contentPadding};
      box-sizing: border-box;
      text-align: center;
    ">
      ${isWide ? `<div style="position: relative; top: 50%; transform: translateY(-50%);">` : ''}
      <h1 style="
        color: #ffffff;
        font-size: ${headlineSize};
        font-weight: 700;
        line-height: 1.08;
        margin: 0 auto ${gap};
        text-shadow: 0 2px 12px rgba(0,0,0,0.25);
      ">${headline}</h1>

      <p style="
        color: rgba(255,255,255,0.85);
        font-size: ${subtextSize};
        font-weight: 400;
        line-height: 1.4;
        margin: 0 auto ${gap};
        max-width: ${isWide ? '500px' : '85%'};
      ">${subtext}</p>

      <div style="
        width: 280px;
        margin: ${isWide ? '0' : '24px'} auto 0;
        background: ${accentColor};
        color: #ffffff;
        font-size: ${ctaSize};
        font-weight: 600;
        padding: ${ctaPadding};
        border-radius: 50px;
        text-transform: uppercase;
        text-align: center;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        position: relative;
      ">${cta}</div>
      ${isWide ? '</div>' : ''}
    </div>
  </div>`
}
