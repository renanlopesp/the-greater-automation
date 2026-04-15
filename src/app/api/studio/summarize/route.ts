import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/studio/summarize — Second-turn LLM call that takes a tool result
 * and produces a short natural-language markdown answer to the user's
 * question. The studio chat's first turn emits JSON with `actions`; this
 * route runs **after** the tool executes client-side and its response is
 * known, so the user gets a proper answer in chat instead of a one-line
 * "N itens carregados" summary.
 *
 * Body:
 *   { userQuestion: string, toolName: string, toolResult: unknown }
 * Returns:
 *   { summary: string }   // markdown, rendered inside the chat bubble
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    userQuestion?: string
    toolName?: string
    toolResult?: unknown
  }
  const userQuestion = String(body.userQuestion ?? '').slice(0, 500)
  const toolName = String(body.toolName ?? 'unknown')
  const toolResult = body.toolResult ?? null

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 })

  // Cap the tool payload we feed to Claude — Nuvemshop responses can be
  // several hundred KB of JSON, which is noise-heavy and wastes tokens.
  const truncated = JSON.stringify(toolResult ?? {}, null, 0).slice(0, 8000)

  const system = `Voce e o assistente do Snew Studio. Acabou de ser executada uma tool.
Sua tarefa: responder a pergunta do usuario em portugues, de forma curta e util, usando markdown.

REGRAS:
- Use os dados reais do toolResult abaixo. NUNCA invente numeros/nomes.
- Destaque produtos, valores e padroes relevantes.
- Se for uma lista de pedidos, liste os principais produtos vendidos com quantidade.
- Se for uma lista de produtos, destaque nome, estoque e preco quando disponivel.
- Maximo 6 linhas de texto. Use bullets e **negrito** com moderacao.
- Se o toolResult esta vazio ou sem dados relevantes, diga isso claramente.
- NAO repita o JSON bruto, NAO use code blocks a menos que precise mostrar um ID.

Tool executada: ${toolName}
Tool result (JSON truncado, max 8KB):
${truncated}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system,
        messages: [{ role: 'user', content: userQuestion || 'Resuma o resultado.' }],
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: 'AI error', detail: t.slice(0, 300) }, { status: 502 })
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> }
    const summary = data.content?.[0]?.text?.trim() ?? ''
    return NextResponse.json({ summary })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'summarize failed' },
      { status: 500 }
    )
  }
}
