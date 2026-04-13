/**
 * 13 default style templates for the Snew Home "Comece agora" strip.
 *
 * Thumbnails are hosted in the Snew Supabase Storage bucket `snew-assets`
 * at `style-thumbs/{id}-0.webp` (primary) and optional `{id}-{n}.webp` (hover).
 * Upload source: snew-ai-core's brand-references bucket (see spec 065 tasks).
 */

export interface HomeStyleTemplate {
  id: string
  name: string
  category: string
  description: string
  thumbnailUrl: string
  hoverImages: string[]
  prompt: string
}

const BUCKET_BASE =
  'https://apsfeutbqvgfgznmaesg.supabase.co/storage/v1/object/public/snew-assets/style-thumbs'

function thumb(id: string, n = 0): string {
  return `${BUCKET_BASE}/${id}-${n}.webp`
}

export const DEFAULT_STYLES: HomeStyleTemplate[] = [
  {
    id: 'ecommerce-photography',
    name: 'E-commerce Photography',
    category: 'Produto isolado',
    description: 'Produto limpo, fundo neutro, luz uniforme',
    thumbnailUrl: thumb('ecommerce-photography'),
    hoverImages: [thumb('ecommerce-photography', 1), thumb('ecommerce-photography', 2)],
    prompt:
      'Professional e-commerce product photography. Clean neutral background, uniform soft lighting, product centered and sharp, white or light gray backdrop, high-end commercial quality',
  },
  {
    id: 'advertising-product',
    name: 'Advertising Product',
    category: 'Produto isolado',
    description: 'Props de ingredientes, fundo dominante, luz dramática e composição editorial',
    thumbnailUrl: thumb('advertising-product'),
    hoverImages: [thumb('advertising-product', 1)],
    prompt:
      'Commercial advertising product photography with editorial storytelling. Single dominant warm color background harmonizing with product palette. Strong directional key light casting intentional hard shadows. Organic props referencing product ingredients — citrus, stones, botanicals, wood. Product as absolute hero, slight 3/4 overhead angle. Rich saturated cinematic color grade, magazine cover worthy',
  },
  {
    id: 'advertising-hold',
    name: 'Advertising Hold',
    category: 'Com pessoa',
    description: 'Modelo segurando produto para câmera, fundo que combina, expressão confiante',
    thumbnailUrl: thumb('advertising-hold'),
    hoverImages: [],
    prompt:
      'Advertising cosmetics photography. Female model holding the product extended toward the camera in the foreground, product sharp and in focus, model slightly soft-focused behind. Model smiling naturally and confidently. Half-body composition. Clean background harmonizing with product color. Soft diffused studio lighting, no harsh shadows. Shallow depth of field with product as hero',
  },
  {
    id: 'advertising-portrait',
    name: 'Advertising Portrait',
    category: 'Com pessoa',
    description: 'Pessoa com expressão forte, produto integrado à cena',
    thumbnailUrl: thumb('advertising-portrait'),
    hoverImages: [
      thumb('advertising-portrait', 1),
      thumb('advertising-portrait', 2),
      thumb('advertising-portrait', 3),
    ],
    prompt:
      'High-end advertising portrait. Model with strong confident expression, product naturally integrated into the scene, dramatic studio lighting, editorial quality, high contrast',
  },
  {
    id: 'fashion-on-model',
    name: 'Fashion On-Model',
    category: 'Com pessoa',
    description: 'Pose de atitude, poder e presença. Vibrant e intimidante',
    thumbnailUrl: thumb('fashion-on-model'),
    hoverImages: [],
    prompt:
      'High-fashion editorial photography. Model with powerful attitude-driven pose, commanding presence, hard directional lighting, deep sculpted shadows, clean off-white backdrop, clothing as hero, cool matte color grade, 85mm lens low angle',
  },
  {
    id: 'ghost-mannequin',
    name: 'Ghost Mannequin',
    category: 'Com pessoa',
    description: 'Roupa estruturada sem modelo, efeito manequim fantasma',
    thumbnailUrl: thumb('ghost-mannequin'),
    hoverImages: [],
    prompt:
      'Ghost mannequin product photography. Clothing structured without model, invisible mannequin effect, clean white background, professional e-commerce quality, garment fully visible',
  },
  {
    id: 'product-lifestyle',
    name: 'Product Lifestyle',
    category: 'Com pessoa',
    description: 'Produto em uso no dia a dia, luz natural, sensação real',
    thumbnailUrl: thumb('product-lifestyle'),
    hoverImages: [],
    prompt:
      'Lifestyle product photography. Product being used in real daily life setting, natural window light, authentic and warm atmosphere, relatable scene, candid feel',
  },
  {
    id: 'flat-lay-editorial',
    name: 'Flat Lay Editorial',
    category: 'Composição',
    description: 'Vista aérea com composição cuidadosa, objetos props',
    thumbnailUrl: thumb('flat-lay-editorial'),
    hoverImages: [],
    prompt:
      'Flat lay editorial photography. Overhead aerial view, product as hero surrounded by carefully arranged complementary props, deliberate composition, clean background, editorial quality',
  },
  {
    id: 'unboxing',
    name: 'Unboxing',
    category: 'Composição',
    description: 'Experiência de abertura da embalagem, gera antecipação',
    thumbnailUrl: thumb('unboxing'),
    hoverImages: [],
    prompt:
      'Unboxing experience photography. Product being revealed from premium packaging, sense of anticipation and excitement, hands interacting with box, warm lighting, aspirational feel',
  },
  {
    id: 'material-detail',
    name: 'Material Detail',
    category: 'Detalhe',
    description: 'Macro extremo na textura e material do produto',
    thumbnailUrl: thumb('material-detail'),
    hoverImages: [],
    prompt:
      'Extreme macro detail photography. Ultra close-up of product texture and material, shallow depth of field, sharp focus on surface details, communicates quality and craftsmanship',
  },
  {
    id: 'product-attributes',
    name: 'Product Attributes',
    category: 'Detalhe',
    description: 'Callouts visuais anotando os atributos do produto',
    thumbnailUrl: thumb('product-infographic'),
    hoverImages: [],
    prompt:
      'Product attributes photography with visual callouts. Clean product shot with annotation lines highlighting key features and benefits, informative yet premium aesthetic',
  },
  {
    id: 'product-infographic',
    name: 'Product Infographic',
    category: 'Detalhe',
    description: 'Macro do material com ícones de atributos sobrepostos, editorial premium',
    thumbnailUrl: thumb('product-infographic'),
    hoverImages: [],
    prompt:
      'Product infographic photography. Extreme macro of material texture as full background with white SVG icon overlays highlighting product attributes. Premium editorial infographic style',
  },
  {
    id: 'pop-illustration',
    name: 'Pop Illustration',
    category: 'Campanha',
    description: 'Modelo foto real + produto ilustrado em cartoon bold. Sem elementos extras',
    thumbnailUrl: thumb('advertising-product'),
    hoverImages: [],
    prompt:
      'Bold pop art illustration with real product. Vibrant Gen Z aesthetic, graphic illustration elements mixed with product photography, energetic colors, bold typography, youthful and attention-grabbing',
  },
]
