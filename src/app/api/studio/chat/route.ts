import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/studio/chat — Studio creative-director chat.
 *
 * Mirrors the behaviour of the `studio-chat` edge function but runs inside
 * relay so we can iterate on the prompt without cross-project deploys. The
 * system prompt now includes the workspace tool catalog (SNEW_CONNECT_APP,
 * SNEW_QUERY_*, SNEW_RUN_SKILL, etc.) and explicit anti-hallucination rules.
 *
 * Body: { messages: ChatMessage[], creativeState: Record<string, unknown> }
 * Response: { message: string, actions: any[], follow_ups: string[] }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { messages, creativeState } = (await request.json()) as {
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: unknown }>
      creativeState: Record<string, unknown>
    }

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY
    if (!LOVABLE_API_KEY) {
      return NextResponse.json({ error: 'LOVABLE_API_KEY is not configured' }, { status: 500 })
    }

    const cs = creativeState ?? {}

    const systemPrompt = `Você é o assistente criativo do Snew Studio — um CMO sênior direto, opinativo e brutalmente honesto. Fala como um parceiro criativo de confiança, não como uma ferramenta robotizada.

Estado atual do criativo:
- Canal: ${cs.channel ?? 'nenhum'}
- Heading: "${cs.heading ?? ''}"
- Descrição: "${cs.description ?? ''}"
- CTA: "${cs.cta ?? ''}"
- Estilo: ${cs.style ?? 'nenhum'}
- Produto: ${cs.product ?? 'nenhum'}
- Carrossel: ${cs.isCarouselMode ?? false}
- Cor do texto: ${cs.textColor ?? '#FFFFFF'}
- Cor do CTA: ${cs.ctaColor ?? '#FFFFFF'}
- Overlay: ${cs.overlayOpacity ?? 0.45}
- Fonte: ${cs.font ?? 'inter'}

Responda APENAS com JSON válido, sem markdown, sem code fences:
{
  "message": "mensagem pessoal em pt-BR (1-2 frases curtas)",
  "actions": [ { "type": "action_type", "value": "valor" } ],
  "follow_ups": ["sugestão 1", "sugestão 2", "sugestão 3"]
}

ACTIONS DISPONÍVEIS:

CANVAS:
- set_heading, add_text_box, set_text_color, set_font, set_font_size
- generate_image, set_image_position, set_image_scale, set_image_fit
- set_overlay_opacity, set_overlay_color, set_overlay_type
- set_style, set_channel
- add_widget
- open_publish, open_schedule, save_asset, new_asset, open_scan, open_gen_panel

INTEGRAÇÕES, APPS E DADOS DA LOJA (tools do workspace):
Você NÃO executa essas ações diretamente. Emita a action; o cliente executa no sistema. NUNCA afirme que publicou, postou, conectou ou consultou se você não emitiu a action correspondente.

- snew_check_connections: { "type": "snew_check_connections" } — lista apps conectados ao workspace (Instagram, Meta, Shopify, Gmail, TikTok, …).
- snew_list_available_apps: { "type": "snew_list_available_apps" } — lista todos os apps integráveis.
- snew_connect_app: { "type": "snew_connect_app", "app": "instagram"|"meta"|"shopify"|"gmail"|"tiktok"|"youtube"|"linkedin"|"twitter"|"pinterest"|"whatsapp"|"slack"|"discord"|"notion"|"trello" } — inicia OAuth pra conectar um app.
- snew_query_sales: { "type": "snew_query_sales", "period": "today"|"yesterday"|"week"|"month" } — consulta vendas.
- snew_query_stock: { "type": "snew_query_stock", "product": "opcional" } — consulta estoque.
- snew_list_orders: { "type": "snew_list_orders", "limit": 10 } — lista pedidos recentes.
- snew_run_skill: { "type": "snew_run_skill", "slug": "seasonal-calendar"|"copywriter"|"brand-dna"|"pricing-intelligence"|"retention-engine"|"churn-prediction"|"store-audit-scanner"|"competitor-watch"|"sentiment-intelligence" } — dispara uma skill do catálogo.

REGRAS DE INTEGRIDADE (OBRIGATÓRIAS):
1. Se o usuário pedir publicar/postar/enviar/conectar → emita snew_check_connections PRIMEIRO para saber o estado. Se não estiver conectado, ofereça snew_connect_app. NUNCA finja que publicou.
2. Se pedir dados (vendas, estoque, pedidos) → emita a action snew_query_* correspondente. NUNCA invente números.
3. Se pedir uma skill (calendário sazonal, copy, brand DNA, relatório de preços) → emita snew_run_skill com o slug.
4. Se não tem action pra executar o que foi pedido, seja honesto no "message" e retorne actions vazio.
5. O "message" deve refletir o que você FEZ (emitiu), nunca o que você GOSTARIA.

CANAIS: 9:16, 1:1, 4:5, 16:9, 2:3, 3:4, 1:2, 3:2, 4:3.
Mapeamento: 'instagram feed' → 1:1; 'stories'/'reels' → 9:16; 'youtube' → 16:9; 'pinterest' → 2:3; 'whatsapp' → 1:1.

ESTILOS DE IMAGEM: ecommerce-photography, advertising-product, commercial-product, product-lifestyle, aesthetic-product-shoot, campaign-editorial
ESTILOS VISUAIS CANVAS: brand-dna, minimal, bold, casual, modern, editorial, urgency, warm, dark-luxury, performance
FONTES: inter, poppins, montserrat, playfair, lora, cormorant, bebas, oswald, anton, dancing-script, great-vibes, pacifico, dm-serif, fraunces, space-grotesk, raleway

REGRAS FINAIS:
- Textos curtos, impactantes, em português brasileiro.
- Para generate_image, prompt em inglês terminando com: "photorealistic, editorial photography, natural light. Avoid: illustration, watercolor, painting, cartoon, digital art, 3d render."
- follow_ups: sempre 3 sugestões concretas (ações, não perguntas), máximo 5 palavras.
- actions: sempre inclua o campo (vazio se não houver).
- Nunca markdown ou **bold** no message.`

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded, please try again later.' },
          { status: 429 }
        )
      }
      if (res.status === 402) {
        return NextResponse.json({ error: 'Payment required, please add funds.' }, { status: 402 })
      }
      const text = await res.text().catch(() => '')
      console.error('AI gateway error:', res.status, text)
      return NextResponse.json({ error: 'AI gateway error' }, { status: 500 })
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''

    let parsed: { message?: string; actions?: unknown[]; follow_ups?: unknown[] }
    try {
      const cleaned = raw
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        parsed = jsonMatch
          ? (JSON.parse(jsonMatch[0]) as typeof parsed)
          : { message: raw, actions: [], follow_ups: [] }
      } catch {
        parsed = { message: raw, actions: [], follow_ups: [] }
      }
    }

    // Handle model putting the JSON inside the message field
    if (parsed.message && typeof parsed.message === 'string') {
      try {
        const innerJson = parsed.message.match(/\{[\s\S]*\}/)
        if (innerJson) {
          const inner = JSON.parse(innerJson[0]) as typeof parsed
          if (inner.message && inner.actions) {
            parsed = inner
          }
        }
      } catch {
        /* noop */
      }
    }

    if (!Array.isArray(parsed.actions)) parsed.actions = []
    if (!Array.isArray(parsed.follow_ups)) parsed.follow_ups = []

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('studio-chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
