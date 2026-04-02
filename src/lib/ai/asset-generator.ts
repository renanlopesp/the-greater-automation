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
 * Each asset uses the product image as background with text overlay.
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

  // Pick product with best image for background
  const heroProduct = products.find((p) => p.image_url) ?? products[0]
  const bgImage = heroProduct?.image_url ?? ''

  // Generate text content for all assets at once
  const { object: textContent } = await generateObject({
    model: openai.chat('gpt-4o'),
    schema: z.object({
      assets: z.array(AssetTemplateSchema).length(4),
    }),
    system: `Você é um designer de marketing para e-commerce brasileiro. Gere textos para 4 assets visuais de uma campanha sazonal.

CAMPANHA: ${dateName}
SLOGAN: "${campaignSlogan}"
NICHO: ${brandDna.niche}
TOM: ${brandDna.tone}
PRODUTO DESTAQUE: ${heroProduct?.name ?? 'produto da loja'}

Gere 4 variações de texto para os formatos:
1. Stories 9:16 (vertical, mobile)
2. Feed 1:1 (quadrado, Instagram)
3. Banner Email 3:1 (horizontal, largo)
4. Stories Meta Ad 9:16 (vertical, anúncio)

Cada um deve ter headline curto e impactante, subtexto, CTA, e cores do overlay que combinem com o nicho "${brandDna.niche}".
Os textos devem estar em Português do Brasil.`,
    messages: [
      {
        role: 'user',
        content: `Gere os textos para os 4 assets da campanha "${dateName}".`,
      },
    ],
  })

  // Build HTML/CSS for each asset
  return ASSET_FORMATS.map((format, i) => {
    const text = textContent.assets[i]
    return {
      label: format.label,
      ratio: format.ratio,
      width: format.width,
      height: format.height,
      html: buildAssetHtml({
        format,
        bgImage,
        headline: text.headline,
        subtext: text.subtext,
        cta: text.cta,
        overlayColor: text.overlayColor,
        textColor: text.textColor,
        ctaBgColor: text.ctaBgColor,
      }),
    }
  })
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

  const headlineSize = isWide ? '28px' : isVertical ? '42px' : '36px'
  const subtextSize = isWide ? '14px' : '16px'
  const ctaSize = isWide ? '13px' : '15px'
  const ctaPadding = isWide ? '10px 24px' : '14px 32px'

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
      justify-content: ${isWide ? 'center' : 'space-between'};
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
        margin: 0;
        text-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${headline}</h1>
      <div style="display: flex; flex-direction: column; align-items: center; gap: ${isWide ? '12px' : '20px'};">
        <p style="
          color: ${textColor};
          font-size: ${subtextSize};
          font-weight: 400;
          line-height: 1.4;
          margin: 0;
          max-width: ${isWide ? '400px' : '320px'};
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
        ">${cta}</a>
      </div>
    </div>
  </div>`
}
