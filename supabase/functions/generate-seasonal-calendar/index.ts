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

  return Response.json({ ok: true, taskId: body.task_id }, { status: 202, headers: CORS_HEADERS })
})

async function runBackground({
  team_id,
  task_id,
  input,
}: {
  team_id: string
  task_id: string
  input?: { year?: number }
}) {
  const sb = supabase()
  try {
    await sb.from('tasks').update({ skill_status: 'running' }).eq('id', task_id)

    const { data: team } = await sb
      .from('teams')
      .select('anthropic_agent_id, anthropic_env_id')
      .eq('id', team_id)
      .single()

    if (!team?.anthropic_agent_id) throw new Error('Team has no Managed Agent')

    const session = await anthropic.beta.sessions.create({
      agent: team.anthropic_agent_id,
      ...(team.anthropic_env_id ? { environment_id: team.anthropic_env_id } : {}),
      metadata: { team_id, task_id, source: 'edge:generate-seasonal-calendar' },
    } as any)

    await (anthropic.beta.sessions.events as any).send(session.id, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: buildPrompt(input?.year) }],
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

    console.log('[generate-seasonal-calendar] raw response length:', fullText.length)

    const jsonMatch = fullText.match(/```(?:json)?\s*\n?([\s\S]*?)```/) ?? [null, fullText]
    const calendar = JSON.parse((jsonMatch[1] ?? fullText).trim())

    if (!calendar.dates || calendar.dates.length === 0) throw new Error('Empty dates array')

    await sb
      .from('tasks')
      .update({
        artifact_data: calendar,
        artifact_type: 'seasonal-calendar',
        skill_status: 'completed',
      })
      .eq('id', task_id)

    console.log(
      `[generate-seasonal-calendar] completed task=${task_id} dates=${calendar.dates.length}`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate-seasonal-calendar] failed:', msg)
    // Write error into artifact_data for debugging (no metadata column on tasks)
    await sb
      .from('tasks')
      .update({
        skill_status: 'failed',
        artifact_data: { error: msg.slice(0, 500), failed_at: new Date().toISOString() } as any,
      })
      .eq('id', task_id)
  }
}

function buildPrompt(year: number | undefined): string {
  const y = year ?? new Date().getFullYear()
  return `Gere um calendário sazonal de ${y} para a loja. Responda APENAS com JSON em bloco \`\`\`json ... \`\`\` com o shape exato: { "year": ${y}, "dates": [{ "id": string, "name": string, "date": string (YYYY-MM-DD), "displayDate": string, "month": number, "priority": "high"|"medium"|"low" }], "summary": { "totalDates": number } }. Inclua 10-18 datas sazonais relevantes para o nicho da loja (use seu contexto de brand DNA e produtos).`
}
