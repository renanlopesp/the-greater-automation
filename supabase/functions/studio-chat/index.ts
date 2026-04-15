import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    // Manual auth check — the Supabase gateway's verify_jwt uses legacy HS256 which
    // does not validate ES256 asymmetric JWTs (used by projects with the new signing keys).
    // We verify the user token inside the function instead, using the SDK's getUser().
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase env not configured')
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: userData, error: userError } = await authClient.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { messages, creativeState } = await req.json()
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured')
    const cs = creativeState ?? {}

    const ecommerceKind: 'nuvemshop' | 'shopify-composio' | null = cs.ecommerceKind ?? null

    const systemPrompt = `Voce e o assistente criativo do Snew Studio — CMO senior, direto e pratico.

ESTADO DO CANVAS:
- Canal: ${cs.channel ?? 'nenhum'}
- Heading: "${cs.heading ?? ''}"
- CTA: "${cs.cta ?? ''}"
- Estilo: ${cs.style ?? 'nenhum'}
- Produto: ${cs.product ?? 'nenhum'}
- Tem imagem no canvas: ${cs.hasImage ?? false}
- Ultima prompt de geracao: "${cs.lastGeneratedPrompt ?? ''}"
- E-commerce conectado: ${ecommerceKind ?? 'nenhum'}

Responda APENAS com JSON valido:
{ "message": "pt-BR 1-2 frases curtas", "actions": [], "follow_ups": ["a","b","c"] }

ACTIONS CANVAS: set_heading, add_text_box, set_text_color, set_font, set_font_size, generate_image, set_image_position, set_image_scale, set_image_fit, set_overlay_opacity, set_overlay_color, set_overlay_type, set_style, set_channel, add_widget, open_publish, open_schedule, save_asset, new_asset, open_scan, open_gen_panel

ACTIONS DE WORKSPACE:
- snew_check_connections, snew_list_available_apps, snew_connect_app, snew_query_sales, snew_query_stock, snew_list_orders, snew_run_skill, snew_post_to_app

COMO EDITAR FOTOS (IMPORTANTISSIMO):
Quando hasImage=true e o usuario pede uma mudanca visual, o cliente envia a imagem atual como REFERENCIA pro Gemini. Seu prompt DEVE instruir o Gemini a usar a imagem como base e mudar SO o pedido, em vez de reescrever cena nova. NUNCA responda "nao consigo editar" — sempre emita generate_image com prompt de edicao.

Formato do prompt pra edicao (hasImage=true):
"Use the reference image exactly as the base. Keep the same subject, pose, composition, lighting, and all other details. Change only: [mudanca pedida]. photorealistic, editorial."

Exemplos (hasImage=true):
- User: "muda a cor do fato pra marrom" -> prompt: "Use the reference image exactly as the base. Keep subject, pose, composition, lighting identical. Change only: the blazer/suit color to brown. photorealistic, editorial."
- User: "troca o fundo pra azul" -> prompt: "Use the reference image exactly as the base. Keep subject, pose, framing identical. Change only: the background color to deep blue. photorealistic, editorial."
- User: "tira o colar" -> prompt: "Use the reference image exactly as the base. Keep everything identical. Change only: remove the necklace. photorealistic, editorial."
- User: "outro angulo" -> prompt: "Use the reference image as composition base — same subject, same wardrobe, same lighting. Change only: shift camera to 3/4 angle. photorealistic, editorial."

Quando hasImage=false (gerar do zero): descreva a cena completa normalmente.

REGRAS ABSOLUTAS:
1. ACTION OU CALA: Se falar "gerando", "postando", "conectando", "criando", "atualizando", voce DEVE emitir a action correspondente.
2. GERAR IMAGEM: qualquer pedido de imagem, edicao de imagem, mudanca visual -> generate_image. Mesmo que ja exista imagem (substitui). NUNCA recuse dizendo "nao consigo editar".
3. POSTAR: hasImage=true e usuario pede postar/publicar/mandar/enviar -> snew_post_to_app (NAO generate_image).
4. CONECTAR: app nao conectado -> snew_check_connections + snew_connect_app.
5. NUNCA invente dados. Tool falhou, reconheca.
6. Follow_ups NUNCA pode conter "Conectar X" (e botao separado).
7. ECOMMERCE EXCLUSIVO: Se "E-commerce conectado" = nuvemshop, voce NUNCA pode emitir snew_connect_app({app:"shopify"}) nem snew_post_to_app({app:"shopify"}). Para perguntas de loja (estoque, vendas, pedidos) use snew_query_stock / snew_query_sales / snew_list_orders — eles ja batem na Nuvemshop. Se o usuario pedir pra "conectar shopify" estando na Nuvemshop, explique que a loja ja esta conectada via Nuvemshop e ofereca os tools de loja em vez disso.

CANAIS: 9:16 1:1 4:5 16:9 2:3 3:4 1:2 3:2 4:3
ESTILOS CANVAS: brand-dna, minimal, bold, casual, modern, editorial, urgency, warm, dark-luxury, performance
FONTES: inter, poppins, montserrat, playfair, lora, cormorant, bebas, oswald, anton

format: pt-BR curto, sem markdown, follow_ups 3 acoes concretas (SEM "Conectar X"), actions sempre presente.

generate_image prompt DEVE ser em ingles, terminando com: photorealistic, editorial photography, natural light. Avoid: illustration, watercolor, painting, cartoon, digital art, 3d render.`

    const anthMessages = messages
      .filter((m: { role?: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: unknown }) => ({
        role: m.role,
        content:
          typeof m.content === 'string'
            ? m.content
            : Array.isArray(m.content)
              ? m.content
                  .map((part: { type?: string; text?: string }) =>
                    part?.type === 'text' ? part.text : ''
                  )
                  .filter(Boolean)
                  .join('\n')
              : String(m.content ?? ''),
      }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthMessages,
      }),
    })
    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: 'Rate limit' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      const t = await response.text()
      return new Response(JSON.stringify({ error: 'AI error', detail: t }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const data = await response.json()
    const raw = data?.content?.[0]?.text?.trim() ?? ''
    let parsed
    try {
      parsed = JSON.parse(
        raw
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
      )
    } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : { message: raw, actions: [], follow_ups: [] }
    }
    if (!Array.isArray(parsed.actions)) parsed.actions = []
    if (!Array.isArray(parsed.follow_ups)) parsed.follow_ups = []

    const msgLower = String(parsed.message ?? '').toLowerCase()
    const lastUserText = String(messages[messages.length - 1]?.content ?? '').toLowerCase()
    const types = new Set(parsed.actions.map((a: { type: string }) => a.type))
    const detectApp = (): string => {
      if (/instagram/.test(msgLower)) return 'instagram'
      if (/twitter|\bx\b/.test(msgLower)) return 'twitter'
      if (/linkedin/.test(msgLower)) return 'linkedin'
      if (/tiktok/.test(msgLower)) return 'tiktok'
      // FR-008 (spec 069): never synthesize a Shopify connect/post action when
      // the team is already on Nuvemshop. Retail data goes through the
      // snew_query_* tools instead.
      if (/shopify/.test(msgLower) && ecommerceKind !== 'nuvemshop') return 'shopify'
      if (/gmail/.test(msgLower)) return 'gmail'
      return 'instagram'
    }
    const USER_EDIT_OR_GENERATE =
      /(ger(ar|a|e|ando)|cri(ar|a|e|ando)|faca|faz(er|endo|a)|quero (uma )?imagem|nova imagem|outra (versao|imagem|opcao)|variacao|mostra|mud(a|ar|e)|troc(a|ar|e)|coloc(a|ar|e)|tir(a|ar|e)|deixa|bota|ponha|editar?|edita|alter(a|ar|e))/i
    const AI_GENERATE_VERB =
      /(gerando|criando|gero|vou gerar|vou criar|fazendo|regerando|atualizando|reaplicando)/i
    if (
      (USER_EDIT_OR_GENERATE.test(lastUserText) || AI_GENERATE_VERB.test(msgLower)) &&
      !types.has('generate_image') &&
      !types.has('snew_post_to_app')
    ) {
      const product = cs.product ?? ''
      const style = cs.style ?? ''
      const lastPrompt = cs.lastGeneratedPrompt ?? ''
      const hasImage = !!cs.hasImage
      const hint = lastUserText.slice(0, 140).replace(/["']/g, '')
      const editPrompt = hasImage
        ? `Use the reference image exactly as the base. Keep the same subject, pose, composition, lighting, and all other details. Change only: ${hint}. ${style ? `Preserve style: ${style}. ` : ''}photorealistic, editorial photography. Avoid: illustration, watercolor, painting, cartoon, digital art, 3d render.`
        : `${lastPrompt ? `${lastPrompt} Change: ${hint}` : hint}. ${product ? `featuring ${product}. ` : ''}${style ? `style: ${style}. ` : ''}photorealistic, editorial photography, natural light. Avoid: illustration, watercolor, painting, cartoon, digital art, 3d render.`
      parsed.actions.unshift({
        type: 'generate_image',
        prompt: editPrompt,
        count: 1,
      })
    }
    const CONNECT_INTENT = /(conecta(ndo|r)|autoriz)/
    // If the user explicitly mentions Shopify but the team is on Nuvemshop,
    // the AI should respond textually (REGRA 7) — do NOT synthesize a
    // fallback connect action with a different app, that would be confusing.
    const userMentionsShopifyOnNuvemshop =
      ecommerceKind === 'nuvemshop' && /shopify/.test(lastUserText)
    if (
      CONNECT_INTENT.test(msgLower) &&
      !types.has('snew_connect_app') &&
      !userMentionsShopifyOnNuvemshop
    ) {
      parsed.actions.push({ type: 'snew_connect_app', app: detectApp() })
    }
    const POST_INTENT = /(post(ando|ar|ei|o)|publica(ndo|r|rei|o)|enviand[oa]|compartilh)/
    if (
      POST_INTENT.test(msgLower) &&
      !types.has('snew_post_to_app') &&
      !types.has('snew_check_connections') &&
      !types.has('snew_connect_app') &&
      !CONNECT_INTENT.test(msgLower) &&
      !userMentionsShopifyOnNuvemshop
    ) {
      parsed.actions.push({ type: 'snew_post_to_app', app: detectApp() })
    }
    parsed.follow_ups = parsed.follow_ups.filter(
      (f: string) => !/^\s*conectar\s/i.test(String(f)) && !/\bautorizar\s/i.test(String(f))
    )

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'err' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
