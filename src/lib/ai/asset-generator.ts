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
  image_url: string
}

/**
 * Generate campaign visual assets using OpenAI image generation.
 * Creates 4 assets in parallel with correct aspect ratios.
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
  const { campaignSlogan, dateName, products, brandDna } = params
  const apiKey = process.env.OPEN_AI_API_KEY
  if (!apiKey) throw new Error('OPEN_AI_API_KEY not set')

  const topProducts = products
    .slice(0, 3)
    .map((p) => p.name)
    .join(', ')

  const results = await Promise.allSettled(
    ASSET_FORMATS.map(async (format) => {
      const prompt = buildImagePrompt({
        format,
        campaignSlogan,
        dateName,
        topProducts,
        brandDna,
      })

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: getImageSize(format),
        }),
      })

      if (!response.ok) {
        const err = await response.text().catch(() => '')
        console.error(`[asset-generator] Failed for ${format.label}:`, response.status, err)
        throw new Error(`Image generation failed: ${response.status}`)
      }

      const data = (await response.json()) as {
        data: Array<{ url?: string; b64_json?: string }>
      }

      const imageData = data.data[0]
      if (!imageData?.url && !imageData?.b64_json) {
        throw new Error('No image URL in response')
      }

      return {
        label: format.label,
        ratio: format.ratio,
        image_url: imageData.url ?? `data:image/png;base64,${imageData.b64_json}`,
      }
    })
  )

  // Collect successful results, log failures
  const assets: GeneratedAsset[] = []
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      assets.push(result.value)
    } else {
      console.error(`[asset-generator] Asset ${ASSET_FORMATS[i].label} failed:`, result.reason)
      // Fallback: CSS gradient placeholder
      assets.push({
        label: ASSET_FORMATS[i].label,
        ratio: ASSET_FORMATS[i].ratio,
        image_url: '', // Empty = component renders gradient fallback
      })
    }
  }

  return assets
}

function buildImagePrompt(params: {
  format: AssetConfig
  campaignSlogan: string
  dateName: string
  topProducts: string
  brandDna: { niche: string; tone: string; positioning: string }
}): string {
  const { format, campaignSlogan, dateName, topProducts, brandDna } = params

  return `Create a professional e-commerce marketing ${format.label} image (${format.ratio} aspect ratio) for a "${dateName}" campaign.

Campaign slogan: "${campaignSlogan}"
Store niche: ${brandDna.niche}
Brand tone: ${brandDna.tone}
Featured products: ${topProducts}

Style: Clean, modern e-commerce aesthetic. Soft pastel colors appropriate for ${brandDna.niche}.
Include decorative elements related to "${dateName}" (no text, just visual motifs).
The image should work as a background/hero for social media marketing.
Do NOT include any text or typography in the image — only visual elements.
Professional quality, suitable for Instagram/Facebook/email marketing.`
}

function getImageSize(format: AssetConfig): string {
  // dall-e-3 supported sizes: 1024x1024, 1024x1792, 1792x1024
  if (format.ratio === '9:16') return '1024x1792'
  if (format.ratio === '1:1') return '1024x1024'
  if (format.ratio === '3:1') return '1792x1024'
  return '1024x1024'
}
