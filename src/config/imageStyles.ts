// ─── Fonte única de verdade para estilos de geração de imagens ───────────────
// Lido por: AssetCreatorModal (Studio) e ImageStylesAdminPage (Admin)

export interface StyleReference {
  id: string
  dataUrl: string
  base64: string
  mimeType: string
}

export interface ImageStyleOption {
  id: string
  name: string
  description?: string
  category: 'photo' | 'illustration' | '3d' | 'design' | 'mixed'
  promptBase: string
  negativePrompt: string
  thumbnailUrl: string
  hoverImages?: string[]
  icon?: string
  color?: string
  isActive?: boolean
  sortOrder?: number
  styleReferences?: StyleReference[]
  buildPrompt?: (params: {
    productName: string
    productDescription?: string
    brandName?: string
    context?: string
    niche?: string
    audience?: string
    tone?: string
    // Visual direction from KB
    modelGender?: string
    modelAge?: string
    modelPose?: string
    visualConcept?: string
    shootingStyle?: string
    lightingMood?: string
    colorMood?: string
    imageBase64?: string
  }) => string
}

export const DEFAULT_IMAGE_STYLES: ImageStyleOption[] = [
  // ── PRODUTO ISOLADO ────────────────────────────────────────────────
  {
    id: 'ecommerce-photography',
    name: 'E-commerce Photography',
    category: 'photo',
    promptBase:
      'studio product photography, pure white background, three-point lighting, product sharp',
    negativePrompt:
      'person, human, hands, lifestyle scene, outdoor, dark background, text, watermark',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(74,111,165,0.55)',
    isActive: true,
    sortOrder: 0,
    buildPrompt: ({ productName }) =>
      `Studio product photography of ${productName || 'the product'}. Pure white seamless background, infinite white backdrop. Three-point lighting setup: key light softbox left, fill light right, rim light behind. No shadows on background. Product perfectly sharp front to back. Shot with 100mm macro lens, f/8 aperture, ISO 100. Ultra clean commercial catalog quality. No person, no hands, product only. No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`,
  },
  {
    id: 'advertising-product',
    name: 'Advertising Product',
    category: 'photo',
    description: 'Props de ingredientes, fundo dominante, luz dramática e composição editorial',
    promptBase:
      "Commercial advertising product photography with editorial storytelling. BACKGROUND: Single dominant solid color that harmonizes with the product's color palette — warm amber, dusty rose, sage green, terracotta, or teal. Avoid pure white. Background tone sets the entire mood. LIGHTING: Strong single directional key light from upper-left or upper-right, casting intentional hard shadows across the scene. Shadows are compositional elements, not problems to fix. Warm golden or cool diffused depending on mood. PROPS: Organic props that reference the product's ingredients or materials — fresh citrus halves, botanical stems, smooth river stones, dried wood, mineral powder, raw earth, flower petals, spice fragments. Each prop placed with deliberate intention. Nothing random. COMPOSITION: Product as absolute hero — centered or slightly off-center. Props arranged in a supporting arc. Slight overhead 3/4 angle or direct front-facing. Negative space is intentional. Scene feels curated, not cluttered. COLOR GRADE: Rich saturated colors matching the background tone. Deep shadows with visible detail. Highlights crisp but not blown. Cinematic quality — the kind of image that stops the scroll. QUALITY: High-end commercial photography, magazine cover worthy, ultra-sharp product, photorealistic.",
    negativePrompt:
      'person, cluttered, flat lighting, amateur, pure white background, text, gradients, stock photo, generic',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(15,15,30,0.75)',
    isActive: true,
    sortOrder: 1,
    buildPrompt: ({ productName, productDescription, brandName }) => {
      const desc = (productDescription?.toLowerCase() ?? '') + (productName?.toLowerCase() ?? '')
      const isPerfume = /perfume|fragrance|parfum|cologne|eau de/.test(desc)
      const isSkincare = /skincare|serum|creme|moisturizer|facial|skin/.test(desc)
      const isHaircare = /shampoo|conditioner|hair|cabelo/.test(desc)
      const isOrganic = /natural|organic|botanic|herbal|plant/.test(desc)
      const bgColor = isPerfume
        ? 'warm amber orange'
        : isSkincare
          ? 'dusty rose or sage green'
          : isHaircare
            ? 'soft warm cream or mineral gray'
            : isOrganic
              ? 'muted sage green or warm sand'
              : 'warm terracotta or deep teal'
      const props = isPerfume
        ? 'fresh citrus halves, smooth river stones, dried flower petals, botanical stems with leaves'
        : isSkincare
          ? 'fresh tropical leaf, water droplets on glass, smooth white oval stones, aloe vera'
          : isHaircare
            ? 'dried botanicals, silk ribbon, smooth pebbles, fresh eucalyptus sprigs'
            : isOrganic
              ? 'raw charcoal pieces, wild botanical stems, mineral stones, dried earth texture'
              : 'smooth river stones, dried pampas grass, raw wood fragments, scattered organic elements'
      return [
        `Commercial advertising product photography of ${productName || 'the product'}.`,
        `Single dominant ${bgColor} background — solid, rich, no gradients.`,
        `Product as absolute hero, centered or slightly off-center on a natural surface (stone, wood, or sand).`,
        `Organic props arranged with deliberate intention around the product: ${props}.`,
        `Strong single key light from upper-left, casting intentional hard shadows — shadows are compositional, not accidental.`,
        `Rich saturated color grade matching the background. Deep shadows with detail. Crisp highlights.`,
        `Slight 3/4 overhead angle, product perfectly sharp. Props in soft supporting bokeh.`,
        `Cinematic high-end commercial quality, scroll-stopping.`,
        productDescription ? `Product context: ${productDescription}.` : '',
        brandName ? `Brand: ${brandName}.` : '',
        `No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`,
      ]
        .filter(Boolean)
        .join(' ')
    },
  },
  {
    id: 'advertising-hold',
    name: 'Advertising Hold',
    category: 'photo',
    description: 'Modelo segurando produto para câmera, fundo que combina, expressão confiante',
    promptBase:
      'Advertising cosmetics photography. Female model holding the product extended toward the camera in the foreground, product sharp and in focus, model slightly soft-focused behind. Model smiling naturally and confidently — warm, approachable expression. Half-body composition. Clean background that harmonizes with the product color (monochromatic match OR soft warm gradient OR clean sky). Soft diffused studio lighting or natural daylight, no harsh shadows. Shallow depth of field with product as hero. No text, no graphics, pure photography.',
    negativePrompt:
      'text in image, letters, words, typography, watermark, logo overlay, text overlay, harsh shadows, dark mood, editorial text, magazine overlay, illustration, cartoon, 3d render, CGI, unflattering pose, hiding face, no eye contact, messy background, cluttered scene',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(220,180,160,0.55)',
    isActive: true,
    sortOrder: 2,
    buildPrompt: ({ productName, brandName, niche, audience, colorMood, lightingMood }) => {
      const isSkincare = /skin|cosm|beleza|beauty|cream|sérum|serum/i.test(niche ?? '')
      const isHaircare = /cabelo|hair|shampoo/i.test(niche ?? '')
      const isBaby = /bebê|baby|infant/i.test(niche ?? '')

      const bgHint =
        colorMood === 'quente'
          ? 'warm peach-to-pink gradient background'
          : colorMood === 'vibrante'
            ? 'bold monochromatic background matching product color'
            : colorMood === 'frio'
              ? 'cool soft blue-grey background'
              : 'clean neutral background harmonizing with product packaging'

      const modelDesc = isBaby
        ? 'young mother with warm expression'
        : isHaircare
          ? 'woman with healthy glowing hair, warm smile'
          : isSkincare
            ? 'woman with clear glowing skin, natural confident smile'
            : 'attractive woman, warm natural smile, confident'

      return [
        `IMPORTANT: NO text, NO letters, NO words in the image. Pure photography only.`,
        `Advertising product photography featuring ${productName || 'the product'}.`,
        `${modelDesc} holding the product extended toward camera in foreground.`,
        `Product is sharp and in perfect focus. Model is slightly soft-focused behind product.`,
        `Half-body composition, product centered and prominent.`,
        `${bgHint}.`,
        `Soft diffused lighting, no harsh shadows, warm and inviting mood.`,
        `Shallow depth of field. Product packaging clearly visible and sharp.`,
        `No text overlay, no watermarks, no graphics. Pure commercial photography.`,
        brandName ? `Brand: ${brandName}.` : '',
        audience ? `Target: ${audience}.` : '',
      ]
        .filter(Boolean)
        .join(' ')
    },
  },

  // ── PRODUTO COM PESSOA ────────────────────────────────────────────
  {
    id: 'advertising-portrait',
    name: 'Advertising Portrait',
    category: 'photo',
    promptBase:
      'high-end advertising portrait, dramatic directional lighting, product worn or featured',
    negativePrompt:
      'multiple people, flat lighting, smiling at camera, stock photo pose, outdoor candid',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(26,18,16,0.65)',
    isActive: true,
    sortOrder: 2,
    buildPrompt: ({ productName, brandName }) => {
      const wornKeywords = [
        'óculos',
        'sunglasses',
        'eyewear',
        'glasses',
        'headphone',
        'fone',
        'earphone',
        'earbud',
        'watch',
        'relógio',
        'cap',
        'hat',
        'jacket',
        'casaco',
        'perfume',
        'ring',
        'earring',
      ]
      const isWorn = wornKeywords.some((w) => (productName || '').toLowerCase().includes(w))
      if (isWorn) {
        return `High-end advertising portrait of a person wearing ${productName}. Profile or 3/4 angle — never facing camera directly. Product perfectly sharp, focal point of the image. Single dramatic key light from upper side, deep shadow on opposite side. Solid background: warm beige for dark products, deep charcoal for light products. Composed confident expression. 85mm lens, f/2.0. Cinematic color grade. ${brandName ? `Brand: ${brandName}.` : ''} No fill light — shadows intentionally deep. No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`
      }
      return `High-end dramatic product photography of ${productName || 'the product'}. Single shaft of spotlight creating strong contrast. Near-black background. Product appears to glow from within. Deep intentional shadows on background. No props, no hands. 100mm lens, f/4. Deep blacks, rich contrast. ${brandName ? `Brand: ${brandName}.` : ''} No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`
    },
  },
  {
    id: 'fashion-on-model',
    name: 'Fashion On-Model',
    description: 'Pose de atitude, poder e presença. Vibrant e intimidante.',
    category: 'photo',
    promptBase:
      'High-fashion editorial photography. Model with a powerful, attitude-driven pose — commanding, confident, slightly intimidating. Strong body language: forward lean, direct eye contact, sharp angles. Dramatic studio lighting with a single hard key light creating deep shadows and sculpted contrast. Clean light gray or off-white backdrop. Clothing as the absolute hero — sharp tailoring, texture details fully visible. Color grade: high contrast, slightly cool, matte skin tones. Shot on 85mm lens, slight low angle to amplify presence and power. No soft or approachable expressions — raw energy, edge, dominance.',
    negativePrompt:
      'cluttered background, outdoor, soft lighting, gentle smile, approachable expression, accessories covering product',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(100,80,140,0.45)',
    isActive: true,
    sortOrder: 3,
    buildPrompt: ({
      productName,
      brandName,
      niche,
      audience,
      modelGender,
      modelAge,
      lightingMood,
      colorMood,
    }) => {
      const isBaby = /beb[êe]|baby|infantil|crian[çc]a|kids|children|newborn|toddler/i.test(
        `${niche ?? ''} ${modelGender ?? ''} ${modelAge ?? ''}`
      )

      if (isBaby) {
        const light = lightingMood || 'natural warm light from a window'
        const colors = colorMood ? `${colorMood} color grade` : 'warm color grade'
        return (
          `Authentic lifestyle fashion photo featuring ${productName || 'the baby garment'} ` +
          `on a real baby or toddler${modelAge ? ` (${modelAge})` : ''}. ` +
          `${light}, soft airy atmosphere. ` +
          `Baby in a relaxed candid moment. Clean neutral background. ` +
          `Product clearly visible with all design details preserved. ${colors}. ` +
          `No text, no graphics, no overlays. Pure photography. ` +
          (brandName ? `Brand: ${brandName}. ` : '') +
          `High quality baby fashion photography.`
        )
      }

      return (
        `High-fashion photography featuring ${productName || 'the garment'} on a model. ` +
        `Powerful attitude-driven pose, commanding presence, raw energy. ` +
        `Hard directional studio lighting, deep sculpted shadows, high contrast. ` +
        `Clean off-white backdrop. Clothing as absolute hero, all details sharp. ` +
        `Cool matte color grade, 85mm lens, slight low angle. ` +
        `No text, no graphics, no overlays, no typography. Pure fashion photography. ` +
        (brandName ? `Brand: ${brandName}. ` : '') +
        (audience ? `Target: ${audience}. ` : '') +
        `Professional fashion photography quality.`
      )
    },
  },
  {
    id: 'product-lifestyle',
    name: 'Product Lifestyle',
    category: 'photo',
    promptBase:
      'authentic lifestyle product photography, real person, natural light, emotional moment',
    negativePrompt: 'studio, white background, stiff pose, harsh light, mannequin, flat lay',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(160,100,50,0.45)',
    isActive: true,
    sortOrder: 4,
    buildPrompt: ({ productName, niche, brandName, modelGender, modelAge }) => {
      const isBaby = /beb[êe]|baby|infantil|crian[çc]a|kids|children|newborn|toddler/i.test(
        `${niche ?? ''} ${modelGender ?? ''} ${modelAge ?? ''}`
      )
      if (isBaby) {
        return `Authentic lifestyle photography featuring ${productName || 'the baby product'} in real use by a baby or toddler. Soft golden hour or warm window light. Baby interacting naturally — playing, crawling, being held by parent. Cozy home environment with warm tones. Beautiful background blur. Film grain, warm color grade. ${brandName ? `Brand: ${brandName}. ` : ''}Emotional and aspirational for young parents. No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`
      }
      return `Authentic lifestyle photography featuring ${productName || 'the product'} in real use. Golden hour or soft window light — warm, natural. Person interacting candidly with the product. Beautiful background blur (bokeh). Cozy, lived-in environment. Film grain, slightly desaturated highlights. Emotional and aspirational. The product is part of the scene, not the only subject. Feels real, not staged. No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`
    },
  },

  // ── DETALHE / TÉCNICO ─────────────────────────────────────────────
  {
    id: 'material-detail',
    name: 'Material Detail',
    category: 'photo',
    promptBase: 'extreme macro product detail, texture, raking light, ultra shallow depth of field',
    negativePrompt: 'person, full product view, flat lighting, plain white background',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(80,60,40,0.55)',
    isActive: true,
    sortOrder: 5,
    buildPrompt: ({ productName }) =>
      `Extreme macro product detail of ${productName || 'the product'} texture and materials. Ultra-close-up — fabric weave, surface texture, stitching, material grain visible. Dramatic raking sidelight revealing texture in 3D relief. Extremely shallow depth of field, only thin plane in sharp focus. Neutral warm background tone. 100mm macro lens, f/2.8. Rich material colors. No person, no full product view. No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`,
  },
  {
    id: 'product-attributes',
    name: 'Product Attributes',
    category: 'photo',
    promptBase:
      'product annotation photo with labeled callouts, clean background, technical diagram style',
    negativePrompt: 'person, dark background, busy scene, text cut off, labels outside frame',
    thumbnailUrl: '',
    icon: 'layout',
    color: 'rgba(40,100,180,0.45)',
    isActive: true,
    sortOrder: 6,
    buildPrompt: ({ productName, context }) => {
      const ratio = context || '1:1'
      const guide = ['9:16', '4:5'].includes(ratio)
        ? 'VERTICAL: product centered in middle 60% of frame, 20% safe margin top and bottom for labels.'
        : 'SQUARE/WIDE: product centered 55% of frame, equal annotation space all sides.'
      return `Commercial product annotation photograph of ${productName || 'the product'}. ${guide} CRITICAL: ALL text labels fully visible inside frame — minimum 12% margin from all edges. Thin hairline lines connecting product parts to uppercase sans-serif labels. Warm off-white linen background. Product flat lay from directly above, perfectly sharp, soft diffused lighting. Features annotated: material, structural details, hardware, finishing. High-end editorial catalog style.`
    },
  },

  // ── CAMPANHA / ILUSTRAÇÃO ─────────────────────────────────────────
  {
    id: 'pop-illustration',
    name: 'Pop Illustration',
    category: 'mixed',
    promptBase:
      "Mixed media product fashion photography: real model with ONLY the product illustrated in bold cartoon style. No extra floating elements around the model. MODEL: Completely photorealistic — real skin, real hair, real expression. The model is a real person in a real environment. PRODUCT: The featured product (shoes, clothing, accessory) rendered in bold cartoon comic-book style OVER the model's body: thick black outline strokes (2-4px bold contour), flat cel-shaded colors — vivid and saturated, not photorealistic, slight paint drip or splash effect where product meets skin/ground, colors amplified to neon or hyper-vivid versions of the original. BACKGROUND: Real photographic environment — rooftop, street, urban location. No illustrations on background. Keep it natural and grounded. COLOR CONTRAST: The illustrated product pops against the real photographic model and background. Product colors: electric neon lime, hot pink, electric purple, vivid cyan. The contrast between real photo and cartoon product is the visual statement. COMPOSITION: Dynamic pose — crouching, jumping, leaning. Low angle or eye-level. Product clearly visible and dominant in frame. Natural sunlight or golden hour. QUALITY: Seamless blend between photorealistic model and cartoon product. The line between real and illustrated feels intentional and precise. High-end editorial quality.",
    negativePrompt:
      'dark, minimal, muted, serious, elegant, plain background, all photo, all illustration, text, watermark, logo, 3d render, floating elements, doodles, speech bubbles, cartoon characters around model',
    thumbnailUrl: '',
    icon: 'sparkles',
    color: 'rgba(255,150,0,0.45)',
    isActive: true,
    sortOrder: 7,
    buildPrompt: ({ productName, brandName }) =>
      [
        `Mixed media fashion editorial: photorealistic model with ${productName || 'the product'} illustrated in bold cartoon style.`,
        `Model is completely real and photographic — real skin, hair, authentic expression and pose.`,
        `The ${productName || 'product'} has thick black comic-book outline strokes with flat cel-shaded neon colors — hot pink, electric lime, vivid purple or cyan.`,
        `Slight paint drip effect where the illustrated product meets the real photo surface.`,
        `Background: real urban environment — rooftop, street, concrete wall. No illustrations on background.`,
        `Dynamic athletic pose — crouching, leaning back, confident energy. Natural sunlight.`,
        `The contrast between photorealistic model and cartoon product is the entire visual statement.`,
        `Seamless high-quality blend. No text, no words, no letters, no typography overlay, no watermarks.`,
        brandName ? `Brand: ${brandName}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
  },

  // ── COMPOSIÇÃO / ESPECIALIZADO ────────────────────────────────────
  {
    id: 'flat-lay-editorial',
    name: 'Flat Lay Editorial',
    category: 'photo',
    promptBase:
      'flat lay product photography, overhead 90 degrees, styled props, editorial composition, clean background',
    negativePrompt:
      'person, angled shot, dark background, busy clutter, random objects, bad composition',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(180,160,130,0.45)',
    isActive: true,
    sortOrder: 8,
    buildPrompt: ({ productName, context }) => {
      const ratio = context || '1:1'
      const isVertical = ['9:16', '4:5', '2:3'].includes(ratio)
      return `Flat lay photograph of ${productName || 'the product'} shot from directly overhead at 90 degrees. COMPOSITION: ${isVertical ? 'Vertical format — product placed in upper third, props filling lower area naturally.' : 'Square or wide format — product centered, props arranged symmetrically or in deliberate asymmetry.'} Product is the clear hero, props support without competing. PROPS & STYLING: 3–5 complementary objects that tell a lifestyle story — small botanicals, fabric swatches, minimal stationery, natural materials. All props flat and arranged with intentional negative space between them. BACKGROUND: Warm white, cream linen texture, or light stone surface. Clean and elevated. LIGHTING: Soft overhead diffused light — no harsh shadows, gentle natural-looking shadows from each object. Even exposure throughout. TECHNICAL: Shot with 50mm or 85mm lens from directly above. Everything in sharp focus (f/8–f/11). Color palette cohesive — props echo product colors. High-end lifestyle aesthetic. No person, no hands. No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`
    },
  },
  {
    id: 'unboxing',
    name: 'Unboxing',
    category: 'photo',
    promptBase:
      'unboxing product photography, premium packaging open, tissue paper, discovery moment, luxury DTC',
    negativePrompt:
      'plain packaging, no tissue paper, boring reveal, dark background, person fully visible',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(240,220,190,0.45)',
    isActive: true,
    sortOrder: 11,
    buildPrompt: ({ productName, brandName }) =>
      `Premium unboxing photography of ${productName || 'the product'}. SCENE: Branded box open at a natural angle, product nestled inside or partially lifted out of tissue paper. The reveal moment. PACKAGING DETAILS: Branded tissue paper (crinkled naturally), ribbon or twine if applicable, kraft or premium cardstock interior. Every detail communicates quality and care. HANDS (optional): Clean, well-manicured hands gently lifting or revealing the product — shot from above or side at 45 degrees. Only hands visible. Alternatively, no hands — product self-reveals. SURFACE: Marble, light wood, or white linen surface. LIGHTING: Soft natural window light from one side creating gentle shadows. Warm, inviting atmosphere. EMOTIONAL QUALITY: The image should make the viewer want to receive this package. Anticipation, quality, care. ${brandName ? `Brand: ${brandName}. Box and tissue paper in brand colors.` : ''} High-end DTC brand aesthetic. No added text, no words, no typography overlay, no watermarks. Pure photography only.`,
  },
  {
    id: 'ghost-mannequin',
    name: 'Ghost Mannequin',
    category: 'photo',
    promptBase:
      'ghost mannequin fashion photography, clothing with invisible mannequin, 3D garment shape, white background',
    negativePrompt:
      'visible mannequin, flat lay, person, model, hanger, folded garment, wrinkles, casual',
    thumbnailUrl: '',
    icon: 'camera',
    color: 'rgba(200,195,210,0.4)',
    isActive: true,
    sortOrder: 12,
    buildPrompt: ({ productName }) =>
      `Ghost mannequin (invisible mannequin) product photography of ${productName || 'the garment'}. TECHNIQUE: The clothing appears to be worn by an invisible person — the garment holds its full 3D shape and volume as if on a body, but no mannequin or model is visible. GARMENT PRESENTATION: Perfectly fitted and shaped, no sagging or collapse. All seams, darts, and structural details clearly visible. Collar, neckline, and shoulder line properly formed. Sleeves with natural arm volume. Interior neck label visible if applicable. BACKGROUND: Pure white seamless, infinite white backdrop. LIGHTING: Soft even studio lighting — key light front-left, fill right, slight rim light to separate garment from background. No harsh shadows. TECHNICAL: 85mm lens, f/8 for full garment sharpness. Garment fills 75–80% of frame. COLOR ACCURACY: Fabric color faithfully reproduced — no color casts. Every fabric detail visible: weave, texture, embroidery, print pattern. No visible mannequin, no person, no hanger, no background props. No text, no words, no letters, no typography overlay, no watermarks. Pure photography only.`,
  },
  {
    id: 'product-infographic',
    name: 'Product Infographic',
    category: 'photo',
    promptBase:
      'Product infographic photography. Extreme close-up macro photograph of the product material, fabric, or texture as the full background — rich detail, deep color, professional studio lighting. Clean, dark or deeply saturated surface that provides contrast for white overlay elements. Shallow depth of field revealing texture and craftsmanship. No persons, no hands. Pure material and texture photography, dramatically lit. No text, no graphics in the image itself.',
    negativePrompt:
      'text in image, letters, words, typography, watermark, labels on product, person, hands, model, face, bright white background, plain background, studio white, illustration, cartoon, 3d render, out of focus background',
    thumbnailUrl: '',
    icon: 'layout',
    color: 'rgba(60,100,80,0.4)',
    isActive: true,
    sortOrder: 13,
    buildPrompt: ({ productName, brandName, niche, colorMood }) => {
      const isFabric = /roupa|tecido|moda|algodão|linho|lã|bebê|baby/i.test(niche ?? '')
      const isElectro = /eletrônico|tech|fone|câmera|celular|gadget|speaker/i.test(niche ?? '')
      const isFurniture = /móvel|decoração|sofá|cadeira|mesa|cama|estante/i.test(niche ?? '')
      const isSkincare = /cosm|skin|beleza|cream|sérum|maquiagem/i.test(niche ?? '')
      const isFood = /alimento|suplemento|protein|whey|nutri|comida/i.test(niche ?? '')
      const isSports = /esporte|fitness|academia|treino|corrida|yoga/i.test(niche ?? '')
      const isBaby = /bebê|baby|infantil|criança/i.test(niche ?? '')

      const photoBase = isElectro
        ? `extreme close-up macro of ${productName || 'electronic device'} surface — circuit texture, brushed metal, precision engineering detail, dark background`
        : isFurniture
          ? `extreme close-up macro of ${productName || 'furniture'} material — wood grain texture, fabric weave, or metal finish, warm rich tones`
          : isSkincare
            ? `extreme close-up macro of luxurious cream or serum texture — smooth surface with soft light reflections, pastel background`
            : isFood
              ? `extreme close-up macro of ${productName || 'product'} ingredients — natural textures, rich organic tones, studio lighting`
              : isSports
                ? `extreme close-up macro of ${productName || 'sports product'} surface — performance fabric or rubber texture, bold colors, directional light`
                : isBaby
                  ? `extreme close-up macro of soft cotton fabric — gentle texture, pastel warm tones, soft diffused lighting`
                  : isFabric
                    ? `extreme close-up macro of ${productName || 'fabric'} textile surface — thread weave visible, rich fiber detail, deep saturated color`
                    : `extreme close-up macro of ${productName || 'the product'} material and texture — rich detail, professional surface`

      const colorBase =
        colorMood === 'quente'
          ? 'warm amber tones, raking golden light'
          : colorMood === 'frio'
            ? 'cool desaturated tones, soft blue-grey light'
            : colorMood === 'vibrante'
              ? 'bold saturated color, dramatic contrast'
              : isElectro
                ? 'dark surfaces, precise studio lighting, high contrast'
                : isFurniture
                  ? 'warm natural tones, soft directional light'
                  : isBaby
                    ? 'soft warm cream tones, gentle diffused light'
                    : 'deep rich tones, professional studio lighting'

      return [
        'IMPORTANT: NO text, NO letters, NO words in image. Pure material photography.',
        `Product infographic base: ${photoBase}.`,
        `${colorBase}.`,
        'Surface fills the entire frame. Shallow depth of field.',
        'High contrast to support white overlay icons.',
        'No persons, no hands, no packaging labels.',
        'Commercial photography quality. Clean surface for graphic overlay.',
        brandName ? `Brand: ${brandName}.` : '',
      ]
        .filter(Boolean)
        .join(' ')
    },
  },
]

// Chave ÚNICA do localStorage — todas as partes do app usam esta
export const STYLES_STORAGE_KEY = 'app:styles'

// Carregar estilos: merge localStorage overrides (thumbnailUrl, etc.) sobre defaults
export function loadImageStyles(): ImageStyleOption[] {
  const mergeWithDefaults = (overrides: Partial<ImageStyleOption>[]) =>
    DEFAULT_IMAGE_STYLES.map((def) => {
      const override = overrides.find((s) => s.id === def.id)
      if (!override) return def
      return {
        ...def,
        name: override.name ?? def.name,
        thumbnailUrl: override.thumbnailUrl ?? def.thumbnailUrl,
        hoverImages: override.hoverImages ?? def.hoverImages ?? [],
        promptBase: override.promptBase ?? def.promptBase,
        negativePrompt: override.negativePrompt ?? def.negativePrompt,
        styleReferences: override.styleReferences ?? def.styleReferences,
        icon: override.icon ?? def.icon,
        color: override.color ?? def.color,
        isActive: override.isActive ?? def.isActive,
        sortOrder: override.sortOrder ?? def.sortOrder,
        buildPrompt: def.buildPrompt, // NEVER overwrite — it's a function
      }
    })

  // Try all known keys in priority order
  const keys = [STYLES_STORAGE_KEY, 'snew:image-styles', 'snew:admin:image-styles']
  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ImageStyleOption>[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeWithDefaults(parsed)
        }
      }
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_IMAGE_STYLES
}

// Salvar estilos (sem buildPrompt — funções não são serializáveis)
export function saveImageStyles(styles: ImageStyleOption[]): void {
  const serializable = styles.map(({ buildPrompt, ...rest }) => rest)
  const data = JSON.stringify(serializable)
  try {
    localStorage.setItem(STYLES_STORAGE_KEY, data)
    // Also write to legacy keys so nothing breaks
    localStorage.setItem('snew:image-styles', data)
  } catch {
    /* quota exceeded */
  }
}
