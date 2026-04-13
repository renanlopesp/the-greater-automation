/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from 'npm:@anthropic-ai/sdk@0.86.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
const supabase = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== Deno.env.get('MCP_AUTH_TOKEN')) {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
  }

  const body = await req.json()

  // @ts-expect-error EdgeRuntime is provided by Supabase
  EdgeRuntime.waitUntil(runBackground(body))

  return Response.json(
    { ok: true, executionId: body.execution_id },
    { status: 202, headers: CORS_HEADERS }
  )
})

async function runBackground({
  team_id,
  execution_id,
  date_id,
  date_name,
  task_id,
}: {
  team_id: string
  execution_id: string
  date_id: string
  date_name: string
  task_id?: string
}) {
  const sb = supabase()
  try {
    const { data: team } = await sb
      .from('teams')
      .select('anthropic_agent_id, anthropic_env_id')
      .eq('id', team_id)
      .single()

    if (!team?.anthropic_agent_id) throw new Error('Team has no Managed Agent')

    const session = await anthropic.beta.sessions.create({
      agent: team.anthropic_agent_id,
      ...(team.anthropic_env_id ? { environment_id: team.anthropic_env_id } : {}),
      metadata: { team_id, execution_id, source: 'edge:generate-seasonal-campaign' },
    } as any)

    await (anthropic.beta.sessions.events as any).send(session.id, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: buildPrompt(date_name) }],
        },
      ],
    })

    const eventStream = await (anthropic.beta.sessions.events as any).stream(session.id)
    let fullText = ''

    for await (const event of eventStream) {
      const e = event as any
      if (e.type === 'agent.message') {
        const texts: string[] =
          e.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text) ?? []
        fullText += texts.join('')
      } else if (e.type === 'session.status_idle' && e.stop_reason?.type === 'end_turn') {
        break
      } else if (e.type === 'session.status_terminated' || e.type === 'session.error') {
        throw new Error(e.error?.message ?? 'session error')
      }
    }

    console.log('[generate-seasonal-campaign] raw response length:', fullText.length)

    const jsonMatch = fullText.match(/```(?:json)?\s*\n?([\s\S]*?)```/) ?? [null, fullText]
    const campaign = JSON.parse((jsonMatch[1] ?? fullText).trim())

    if (!campaign.concept) throw new Error('Missing concept in campaign response')

    // Inject standard fields
    campaign.dateId = date_id
    campaign.dateName = date_name

    await sb
      .from('skill_executions')
      .update({
        status: 'completed',
        output: campaign,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution_id)

    if (task_id) {
      const { data: taskRow } = await sb
        .from('tasks')
        .select('artifact_data')
        .eq('id', task_id)
        .single()
      const current = (taskRow?.artifact_data as any) ?? {}
      const existingCampaigns = current.campaigns ?? {}
      const updatedArtifactData = {
        ...current,
        campaigns: { ...existingCampaigns, [date_id]: campaign },
      }
      await sb.from('tasks').update({ artifact_data: updatedArtifactData }).eq('id', task_id)
      console.log(`[generate-seasonal-campaign] updated task=${task_id} campaign=${date_id}`)
    }

    console.log(`[generate-seasonal-campaign] completed execution=${execution_id}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate-seasonal-campaign] failed:', msg)
    await sb
      .from('skill_executions')
      .update({
        status: 'failed',
        error_message: msg.slice(0, 500),
        completed_at: new Date().toISOString(),
        output: { error: msg.slice(0, 500), failed_at: new Date().toISOString() } as any,
      })
      .eq('id', execution_id)
  }
}

function buildPrompt(dateName: string): string {
  return `Gere uma campanha COMPLETA de marketing para "${dateName}" (data comemorativa/sazonal) usando o contexto de brand DNA + produtos da loja. Responda APENAS com JSON em bloco \`\`\`json ... \`\`\` no shape EXATO abaixo (FullCampaign):

{
  "intro": "string — 2-3 frases de introdução emocional/contextual sobre a data",
  "concept": {
    "slogan": "string — slogan curto e impactante (≤ 8 palavras)",
    "description": "string — parágrafo descrevendo o conceito estratégico da campanha",
    "products": [
      { "product_id": "string", "name": "string", "price": number, "image_url": "string", "tag": "best-seller|cross-sell|alta-margem|lancamento", "stock": number }
    ],
    "alternates": [
      { "slogan": "string (alternativo)", "description": "string (curta)" }
    ]
  },
  "selectedProducts": [ /* mesma shape que concept.products, 4-6 produtos do catálogo */ ],
  "curatedProducts": [ /* opcional, se diferente de selectedProducts */ ],
  "emailSubject": "string",
  "emailPreview": "string — preview text curto (pré-header)",
  "copies": [
    { "channel": "instagram|facebook|tiktok|whatsapp|email", "timing": "teaser|lançamento|lembrete|urgência", "text": "string com emojis e quebras de linha se necessário" }
  ],
  "assets": [
    { "label": "Story Teaser|Post Feed|Banner Site|...", "ratio": "1:1|9:16|4:5|16:9", "bg": "descrição curta da cor/background", "html": "<div>HTML inline opcional do asset</div>" }
  ],
  "videoScripts": [
    { "title": "string", "duration": "15s|30s|60s", "content": "roteiro cena a cena" }
  ],
  "timeline": [
    { "day": "D-30|D-21|D-14|D-7|D-3|D-1|D-Day|D+1", "actions": ["ação 1", "ação 2"] }
  ]
}

Requisitos:
- 2-3 slogans alternativos
- 3-5 copies variando por canal e timing
- 3-6 assets com ratio e brief de cor
- 2-3 video scripts curtos
- timeline com 5-8 marcos (ex: D-30 teaser, D-14 intensifica, D-Day pico)
- produtos REAIS do catálogo da loja (use IDs, preços e imagens que você conhece)
- adapte completamente ao brand DNA da loja (tom, público, niche)
- Português do Brasil.

IMPORTANTE: responda APENAS com o bloco JSON. Qualquer texto fora dele quebra o sistema.`
}
