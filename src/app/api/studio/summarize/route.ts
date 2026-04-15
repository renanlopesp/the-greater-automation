import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Reduce a Nuvemshop API response (or any tool result with `{resource,data}`)
 * to only the fields relevant for answering a user's question. Keeps record
 * counts reasonable so Claude sees the WHOLE dataset instead of getting
 * truncated at 8KB into the first record. Full raw data stays in the
 * side-panel artifact — the summarizer just needs the shape.
 */
function compactToolResult(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const r = raw as Record<string, unknown>
  const resource = String(r.resource ?? '')
  const data = r.data
  if (!Array.isArray(data)) return { resource, data }

  const compacted = data.map((row) => compactRow(resource, row))
  return { resource, count: compacted.length, data: compacted }
}

function compactRow(resource: string, row: unknown): unknown {
  if (!row || typeof row !== 'object') return row
  const o = row as Record<string, unknown>
  if (resource === 'orders') {
    return {
      id: o.id,
      number: o.number,
      status: o.status,
      payment_status: o.payment_status,
      shipping_status: o.shipping_status,
      total: o.total,
      created_at: o.created_at,
      paid_at: o.paid_at,
      customer: pickCustomer(o.customer),
      products: Array.isArray(o.products)
        ? (o.products as unknown[]).map((p) => compactProductLine(p))
        : undefined,
    }
  }
  if (resource === 'products') {
    return {
      id: o.id,
      name: typeof o.name === 'object' ? pickLocalized(o.name) : o.name,
      handle: o.handle,
      total_stock: Array.isArray(o.variants)
        ? (o.variants as Array<{ stock?: number }>).reduce(
            (s, v) => s + (typeof v?.stock === 'number' ? v.stock : 0),
            0
          )
        : undefined,
      price: Array.isArray(o.variants)
        ? (o.variants as Array<{ price?: string }>)[0]?.price
        : undefined,
      variant_count: Array.isArray(o.variants) ? (o.variants as unknown[]).length : undefined,
    }
  }
  if (resource === 'customers') {
    return {
      id: o.id,
      name: o.name,
      email: o.email,
      total_spent: o.total_spent,
      total_orders: (o as { total_orders?: unknown }).total_orders,
      created_at: o.created_at,
    }
  }
  if (resource === 'coupons') {
    return {
      id: o.id,
      code: o.code,
      type: o.type,
      value: o.value,
      valid: o.valid,
      used: o.used,
      max_uses: o.max_uses,
    }
  }
  return o
}

function compactProductLine(p: unknown): unknown {
  if (!p || typeof p !== 'object') return p
  const o = p as Record<string, unknown>
  return {
    name: o.name,
    quantity: o.quantity,
    price: o.price,
    product_id: o.product_id,
  }
}

function pickCustomer(c: unknown): unknown {
  if (!c || typeof c !== 'object') return c
  const o = c as Record<string, unknown>
  return { id: o.id, name: o.name, email: o.email }
}

function pickLocalized(v: unknown): string {
  if (!v || typeof v !== 'object') return String(v ?? '')
  const o = v as Record<string, unknown>
  return String(o.pt ?? o.es ?? Object.values(o)[0] ?? '')
}

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

  // Project Nuvemshop payloads down to only the fields useful for answering.
  // Without this a 13-order response was being truncated mid-object at 8KB,
  // causing Claude to respond with "só consigo detalhar 1 pedido — o resto
  // ficou truncado" — which the user rightfully hated.
  const compact = compactToolResult(toolResult)
  const truncated = JSON.stringify(compact ?? {}, null, 0).slice(0, 24000)

  const system = `Voce e o assistente do Snew Studio. Acabou de ser executada uma tool.
Sua tarefa: responder a pergunta do usuario em portugues, de forma curta, util e COMPLETA, usando markdown.

REGRAS:
- Use os dados reais do toolResult abaixo. NUNCA invente numeros/nomes.
- O toolResult ja esta pre-processado e tem TODOS os registros relevantes. NAO diga que os dados estao "truncados" ou "limitados". NUNCA sugira "verifique no painel da Nuvem Shop" — voce ja tem os dados.
- Destaque produtos, valores e padroes relevantes.
- Se for uma lista de pedidos, AGREGUE os produtos vendidos (some as quantidades por produto) e liste no topo os mais vendidos. NAO liste pedido-por-pedido.
- Se for uma lista de produtos, destaque nome, estoque e preco quando disponivel.
- Maximo 8 linhas de texto. Use bullets e **negrito** com moderacao.
- Se o toolResult esta realmente vazio, diga "Sem registros nesse periodo" e sugira uma janela maior.
- NAO repita o JSON bruto, NAO use code blocks.

Tool executada: ${toolName}
Tool result (JSON compactado, contem TODOS os registros):
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
