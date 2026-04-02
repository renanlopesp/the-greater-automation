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
  headline: z.string().describe('Frase curta e impactante (max 6 palavras)'),
  subtext: z.string().describe('Complemento curto (max 12 palavras)'),
  cta: z.string().describe('Texto do botão CTA (max 3 palavras)'),
  accentColor: z
    .string()
    .describe('Cor de destaque que combina com o nicho (ex: #c9a96e, #e8b4b8, #7fb069, #4a90d9)'),
  bgColor: z
    .string()
    .describe(
      'Cor de fundo sólida para a seção de texto, tom suave/claro (ex: #faf6f0, #f5f0eb, #f0f4f0, #1a1a1a)'
    ),
  textColor: z
    .string()
    .describe(
      'Cor do texto principal — escuro para fundo claro, claro para fundo escuro (ex: #1a1a1a, #ffffff)'
    ),
})

/**
 * Generate campaign visual assets as modern HTML/CSS templates.
 * Each product gets its own asset per format with split layouts.
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

  const productList = productsWithImages.map((p) => `${p.name} (R$ ${p.price})`).join('\n')

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
        system: `Você é um designer de social media premium para e-commerce brasileiro em 2026. Crie textos para ${productsWithImages.length} assets "${format.label}" (${format.ratio}).

CAMPANHA: ${dateName}
SLOGAN: "${campaignSlogan}"
NICHO: ${brandDna.niche}
TOM: ${brandDna.tone}
POSICIONAMENTO: ${brandDna.positioning}

PRODUTOS (1 asset para cada):
${productList}

ESTILO DE DESIGN 2026:
- Minimalista e sofisticado, sem poluição visual
- Headlines curtas e certeiras (max 6 palavras)
- Subtexto elegante e direto
- CTA curto (2-3 palavras): "Ver Agora", "Comprar", "Descubra"
- Cores: use paleta que transmita premium/sofisticação para o nicho "${brandDna.niche}"
- bgColor deve ser um tom suave que complemente a foto do produto
- Para nicho bebê/infantil: tons pastéis suaves (#faf6f0, #f5ebe0, #e8e0d4)
- Para moda: tons neutros elegantes (#f5f0eb, #ebe5dc, #1a1a1a)
- Para tech: tons clean (#f8f9fa, #e9ecef, #1a1a2e)
- textColor: escuro (#1a1a1a, #2d2d2d) para fundos claros, claro (#ffffff, #f5f0e8) para fundos escuros
- accentColor: cor que destaque CTA e elementos decorativos

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
            productName: product.name,
            productPrice: product.price,
            headline: text.headline,
            subtext: text.subtext,
            cta: text.cta,
            accentColor: text.accentColor,
            bgColor: text.bgColor,
            textColor: text.textColor,
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
  productName: string
  productPrice: number
  headline: string
  subtext: string
  cta: string
  accentColor: string
  bgColor: string
  textColor: string
}): string {
  const {
    format,
    bgImage,
    productName,
    productPrice,
    headline,
    subtext,
    cta,
    accentColor,
    bgColor,
    textColor,
  } = params

  if (format.ratio === '9:16') return buildStories(params)
  if (format.ratio === '1:1') return buildFeed(params)
  if (format.ratio === '3:1') return buildBanner(params)
  // Fallback
  return buildStories(params)
}

/** Stories 9:16 — Product image top 60%, content bottom 40% */
function buildStories(p: {
  format: AssetConfig
  bgImage: string
  productName: string
  productPrice: number
  headline: string
  subtext: string
  cta: string
  accentColor: string
  bgColor: string
  textColor: string
}): string {
  const {
    format,
    bgImage,
    productName,
    productPrice,
    headline,
    subtext,
    cta,
    accentColor,
    bgColor,
    textColor,
  } = p
  const priceFormatted = `R$ ${productPrice.toLocaleString('pt-BR')}`
  const isMetaAd = format.label.includes('Meta Ad')

  return `<div style="
    width: ${format.width}px;
    height: ${format.height}px;
    display: flex;
    flex-direction: column;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    overflow: hidden;
    background: ${bgColor};
  ">
    <!-- Product image area (60%) -->
    <div style="
      width: 100%;
      height: ${Math.round(format.height * 0.6)}px;
      background-image: url('${bgImage}');
      background-size: cover;
      background-position: center;
      position: relative;
    ">
      ${
        isMetaAd
          ? `<div style="
        position: absolute;
        top: 40px;
        left: 40px;
        background: ${accentColor};
        color: #fff;
        font-size: 22px;
        font-weight: 700;
        padding: 10px 24px;
        border-radius: 40px;
        letter-spacing: 0.02em;
      ">AD</div>`
          : ''
      }
    </div>

    <!-- Content area (40%) -->
    <div style="
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      padding: 50px 60px;
      gap: 16px;
    ">
      <p style="
        font-size: 22px;
        font-weight: 500;
        color: ${accentColor};
        margin: 0;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      ">${productName.length > 30 ? productName.substring(0, 30) + '...' : productName}</p>

      <h1 style="
        font-size: 52px;
        font-weight: 800;
        color: ${textColor};
        margin: 0;
        line-height: 1.05;
        letter-spacing: -0.02em;
      ">${headline}</h1>

      <p style="
        font-size: 24px;
        color: ${textColor};
        opacity: 0.7;
        margin: 0;
        line-height: 1.4;
        max-width: 80%;
      ">${subtext}</p>

      <div style="
        display: flex;
        align-items: center;
        gap: 24px;
        margin-top: 16px;
      ">
        <span style="
          font-size: 40px;
          font-weight: 800;
          color: ${textColor};
          letter-spacing: -0.02em;
        ">${priceFormatted}</span>
      </div>

      <a style="
        display: inline-block;
        background: ${accentColor};
        color: #ffffff;
        font-size: 20px;
        font-weight: 600;
        padding: 18px 48px;
        border-radius: 50px;
        text-decoration: none;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-top: 8px;
      ">${cta}</a>
    </div>
  </div>`
}

/** Feed 1:1 — Product image with frosted bottom bar */
function buildFeed(p: {
  format: AssetConfig
  bgImage: string
  productName: string
  productPrice: number
  headline: string
  subtext: string
  cta: string
  accentColor: string
  bgColor: string
  textColor: string
}): string {
  const {
    format,
    bgImage,
    productName,
    productPrice,
    headline,
    subtext,
    cta,
    accentColor,
    bgColor,
    textColor,
  } = p
  const priceFormatted = `R$ ${productPrice.toLocaleString('pt-BR')}`

  return `<div style="
    width: ${format.width}px;
    height: ${format.height}px;
    position: relative;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    overflow: hidden;
    background-image: url('${bgImage}');
    background-size: cover;
    background-position: center;
  ">
    <!-- Top accent bar -->
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 6px;
      background: ${accentColor};
    "></div>

    <!-- Bottom content panel -->
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      background: ${bgColor};
      padding: 40px 48px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      ">
        <div style="flex: 1;">
          <h2 style="
            font-size: 36px;
            font-weight: 800;
            color: ${textColor};
            margin: 0;
            line-height: 1.1;
            letter-spacing: -0.01em;
          ">${headline}</h2>
          <p style="
            font-size: 18px;
            color: ${textColor};
            opacity: 0.6;
            margin: 8px 0 0 0;
            line-height: 1.3;
          ">${subtext}</p>
        </div>
        <span style="
          font-size: 32px;
          font-weight: 800;
          color: ${accentColor};
          white-space: nowrap;
          margin-left: 24px;
        ">${priceFormatted}</span>
      </div>

      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
      ">
        <p style="
          font-size: 15px;
          color: ${textColor};
          opacity: 0.5;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        ">${productName.length > 40 ? productName.substring(0, 40) + '...' : productName}</p>
        <a style="
          display: inline-block;
          background: ${accentColor};
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          padding: 12px 32px;
          border-radius: 50px;
          text-decoration: none;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        ">${cta}</a>
      </div>
    </div>
  </div>`
}

/** Banner Email 3:1 — Horizontal split: image left, content right */
function buildBanner(p: {
  format: AssetConfig
  bgImage: string
  productName: string
  productPrice: number
  headline: string
  subtext: string
  cta: string
  accentColor: string
  bgColor: string
  textColor: string
}): string {
  const {
    format,
    bgImage,
    productName,
    productPrice,
    headline,
    subtext,
    cta,
    accentColor,
    bgColor,
    textColor,
  } = p
  const priceFormatted = `R$ ${productPrice.toLocaleString('pt-BR')}`

  return `<div style="
    width: ${format.width}px;
    height: ${format.height}px;
    display: flex;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    overflow: hidden;
    background: ${bgColor};
  ">
    <!-- Product image (left 40%) -->
    <div style="
      width: 40%;
      height: 100%;
      background-image: url('${bgImage}');
      background-size: cover;
      background-position: center;
    "></div>

    <!-- Content (right 60%) -->
    <div style="
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 48px;
      gap: 8px;
    ">
      <p style="
        font-size: 13px;
        font-weight: 600;
        color: ${accentColor};
        margin: 0;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      ">${productName.length > 35 ? productName.substring(0, 35) + '...' : productName}</p>

      <h2 style="
        font-size: 28px;
        font-weight: 800;
        color: ${textColor};
        margin: 0;
        line-height: 1.1;
        letter-spacing: -0.01em;
      ">${headline}</h2>

      <p style="
        font-size: 14px;
        color: ${textColor};
        opacity: 0.6;
        margin: 0;
        line-height: 1.3;
      ">${subtext}</p>

      <div style="
        display: flex;
        align-items: center;
        gap: 20px;
        margin-top: 4px;
      ">
        <span style="
          font-size: 24px;
          font-weight: 800;
          color: ${textColor};
        ">${priceFormatted}</span>
        <a style="
          display: inline-block;
          background: ${accentColor};
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 28px;
          border-radius: 50px;
          text-decoration: none;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        ">${cta}</a>
      </div>
    </div>
  </div>`
}
