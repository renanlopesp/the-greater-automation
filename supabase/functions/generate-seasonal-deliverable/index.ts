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

type Section = 'copies' | 'email' | 'assets' | 'video' | 'timeline'

const ASSET_FORMATS = [
  { label: 'Instagram Stories', ratio: '9:16', width: 1080, height: 1920 },
  { label: 'Instagram Feed', ratio: '1:1', width: 1080, height: 1080 },
  { label: 'Instagram Reels/TikTok', ratio: '9:16', width: 1080, height: 1920 },
  { label: 'Carrossel Post', ratio: '4:5', width: 1080, height: 1350 },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== Deno.env.get('MCP_AUTH_TOKEN')) {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS })
  }
  const body = await req.json()
  // @ts-expect-error EdgeRuntime
  EdgeRuntime.waitUntil(runBackground(body))
  return Response.json({ ok: true }, { status: 202, headers: CORS_HEADERS })
})

async function runBackground({
  team_id,
  task_id,
  date_id,
  section_type,
  execution_id,
}: {
  team_id: string
  task_id: string
  date_id: string
  section_type: Section
  execution_id?: string
}) {
  const sb = supabase()
  try {
    const { data: taskRow } = await sb
      .from('tasks')
      .select('artifact_data')
      .eq('id', task_id)
      .single()
    const artifact = (taskRow?.artifact_data as any) ?? {}
    const campaign = artifact.campaigns?.[date_id]
    if (!campaign?.concept) throw new Error('Campaign concept not found; generate campaign first')

    await updateDeliverableStatus(sb, task_id, date_id, section_type, 'generating')

    const { data: team } = await sb
      .from('teams')
      .select('anthropic_agent_id, anthropic_env_id')
      .eq('id', team_id)
      .single()
    if (!team?.anthropic_agent_id) throw new Error('Team has no Managed Agent')

    let result: any
    if (section_type === 'assets')
      result = await generateAssets(team.anthropic_agent_id, team.anthropic_env_id, campaign)
    else if (section_type === 'email')
      result = await generateEmail(team.anthropic_agent_id, team.anthropic_env_id, campaign)
    else
      result = await generateTextSection(
        team.anthropic_agent_id,
        team.anthropic_env_id,
        section_type,
        campaign
      )

    await mergeSectionIntoCampaign(sb, task_id, date_id, section_type, result)
    if (execution_id)
      await sb
        .from('skill_executions')
        .update({ status: 'completed', output: result, completed_at: new Date().toISOString() })
        .eq('id', execution_id)
    console.log(`[generate-seasonal-deliverable] done date=${date_id} section=${section_type}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate-seasonal-deliverable] failed:', msg)
    await updateDeliverableStatus(sb, task_id, date_id, section_type, 'failed')
    if (execution_id)
      await sb
        .from('skill_executions')
        .update({
          status: 'failed',
          error_message: msg.slice(0, 500),
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution_id)
  }
}

async function askAgent(agentId: string, envId: string | null, prompt: string): Promise<string> {
  const session = await anthropic.beta.sessions.create({
    agent: agentId,
    ...(envId ? { environment_id: envId } : {}),
    metadata: { source: 'edge:generate-seasonal-deliverable' },
  } as any)
  await (anthropic.beta.sessions.events as any).send(session.id, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: prompt }] }],
  })
  const eventStream = await (anthropic.beta.sessions.events as any).stream(session.id)
  let fullText = ''
  for await (const event of eventStream) {
    const e = event as any
    if (e.type === 'agent.message') {
      const texts: string[] =
        e.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text) ?? []
      fullText += texts.join('')
    } else if (e.type === 'session.status_idle' && e.stop_reason?.type === 'end_turn') break
    else if (e.type === 'session.status_terminated' || e.type === 'session.error')
      throw new Error(e.error?.message ?? 'session error')
  }
  return fullText
}

function parseJsonBlock(text: string): any {
  const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/) ?? [null, text]
  return JSON.parse((jsonMatch[1] ?? text).trim())
}

async function generateTextSection(
  agentId: string,
  envId: string | null,
  section: Section,
  campaign: any
): Promise<any> {
  const fullText = await askAgent(agentId, envId, buildTextPrompt(section, campaign))
  return parseJsonBlock(fullText)
}

async function generateEmail(agentId: string, envId: string | null, campaign: any): Promise<any> {
  const products = (campaign.curatedProducts ?? campaign.selectedProducts ?? []).slice(0, 6)
  const prompt = `Você é especialista em email marketing para e-commerce brasileiro. Gere um email HTML COMPLETO, responsivo, table-based para esta campanha.

CAMPANHA: "${campaign.dateName}"
SLOGAN: "${campaign.concept.slogan}"
DESCRIÇÃO: ${campaign.concept.description}

PRODUTOS (USE as imagens reais abaixo no grid do email):
${products.map((p: any, i: number) => `${i + 1}. ${p.name} — R$ ${p.price} — ${p.image_url ?? 'sem imagem'}`).join('\n')}

INSTRUÇÕES HTML:
1. Estrutura table-based (compatibilidade Outlook/Gmail)
2. max-width 600px centralizado
3. CSS 100% inline em cada elemento
4. Seções: Hero (slogan grande + subtítulo da data) → Grid de produtos 2 por linha com <img src="URL_REAL" width="250" height="250" alt="nome" style="display:block;"> + nome + preço → CTA grande "Comprar Agora" centralizado → Footer pequeno "Você recebeu... Descadastrar"
5. Cores que combinem com o nicho
6. font-family Arial,Helvetica,sans-serif
7. Inicie com <!DOCTYPE html> e termine com </html>

Retorne APENAS JSON em bloco \`\`\`json ... \`\`\`:
{
  "subject": "string (≤ 60 chars com emoji)",
  "preview": "string pré-header 80-100 chars",
  "html": "string — HTML completo começando com <!DOCTYPE html>"
}

Português BR. Apenas JSON.`
  const fullText = await askAgent(agentId, envId, prompt)
  return parseJsonBlock(fullText)
}

async function generateAssets(agentId: string, envId: string | null, campaign: any): Promise<any> {
  const products = (campaign.curatedProducts ?? campaign.selectedProducts ?? []).filter(
    (p: any) => p.image_url
  )
  if (products.length === 0)
    throw new Error(
      'Nenhum produto com imagem disponível. Regenere a campanha para puxar produtos reais.'
    )

  const allAssets: any[] = []
  for (const format of ASSET_FORMATS) {
    const prompt = `Você é designer social media premium. Gere textos para ${products.length} assets no formato "${format.label}" (${format.ratio}).

CAMPANHA: "${campaign.dateName}"
SLOGAN: "${campaign.concept.slogan}"

PRODUTOS (1 asset por produto, foto full-bleed):
${products.map((p: any, i: number) => `${i + 1}. ${p.name}`).join('\n')}

Estilo: foto de produto full-bleed + gradiente inferior + texto centralizado. Headlines de CAMPANHA, CTA curto.

Retorne APENAS JSON em bloco \`\`\`json ... \`\`\`:
{
  "items": [
    { "headline": "max 6 palavras", "subtext": "max 12 palavras", "cta": "max 3 palavras", "gradientColor": "rgba(R,G,B,A)", "accentColor": "#hex" }
  ]
}

Exatamente ${products.length} items. Português BR.`

    const text = await askAgent(agentId, envId, prompt)
    const parsed = parseJsonBlock(text)
    const items = parsed.items ?? parsed
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const t = items[i]
      if (!t) continue
      allAssets.push({
        label: format.label,
        ratio: format.ratio,
        width: format.width,
        height: format.height,
        product_name: product.name,
        product_id: product.product_id,
        html: buildAssetHtml({
          format,
          bgImage: product.image_url,
          headline: t.headline,
          subtext: t.subtext,
          cta: t.cta,
          gradientColor: t.gradientColor,
          accentColor: t.accentColor,
        }),
      })
    }
  }
  return { assets: allAssets }
}

function buildAssetHtml(p: {
  format: { label: string; ratio: string; width: number; height: number }
  bgImage: string
  headline: string
  subtext: string
  cta: string
  gradientColor: string
  accentColor: string
}): string {
  const { format, bgImage, headline, subtext, cta, gradientColor, accentColor } = p
  const isVertical = format.ratio === '9:16'
  const is45 = format.ratio === '4:5'
  const gradientHeight = isVertical ? '60%' : is45 ? '58%' : '55%'
  const headlineSize = isVertical ? '56px' : is45 ? '50px' : '44px'
  const subtextSize = isVertical ? '24px' : is45 ? '22px' : '20px'
  const ctaSize = isVertical ? '18px' : '16px'
  const ctaPadding = isVertical ? '18px 48px' : '16px 40px'
  const contentPadding = isVertical ? '0 60px 140px' : is45 ? '0 56px 100px' : '0 48px 80px'
  const gap = isVertical ? '28px' : '22px'
  const fadedGradient = gradientColor.replace(/[\d.]+\)$/, '0.4)')
  return `<div style="position:relative;width:${format.width}px;height:${format.height}px;overflow:hidden;font-family:'Helvetica Neue',Arial,sans-serif;background-image:url('${bgImage}');background-size:cover;background-position:center;">
    <div style="position:absolute;bottom:0;left:0;width:100%;height:${gradientHeight};background:linear-gradient(to top, ${gradientColor}, ${fadedGradient}, transparent);"></div>
    <div style="position:absolute;bottom:0;left:0;width:100%;padding:${contentPadding};box-sizing:border-box;text-align:center;">
      <h1 style="color:#ffffff;font-size:${headlineSize};font-weight:700;line-height:1.08;margin:0 auto ${gap};text-shadow:0 2px 12px rgba(0,0,0,0.25);">${headline}</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:${subtextSize};font-weight:400;line-height:1.4;margin:0 auto ${gap};max-width:85%;">${subtext}</p>
      <div style="display:inline-block;margin:24px auto 0;background:${accentColor};color:#ffffff;font-size:${ctaSize};font-weight:600;padding:${ctaPadding};border-radius:50px;text-transform:uppercase;letter-spacing:0.5px;">${cta}</div>
    </div>
  </div>`
}

async function updateDeliverableStatus(
  sb: any,
  task_id: string,
  date_id: string,
  section: Section,
  status: string
) {
  const { data } = await sb.from('tasks').select('artifact_data').eq('id', task_id).single()
  const artifact = (data?.artifact_data as any) ?? {}
  const campaigns = artifact.campaigns ?? {}
  const campaign = campaigns[date_id] ?? {}
  const deliverables = campaign.deliverables ?? {}
  deliverables[section] = { ...(deliverables[section] ?? {}), status }
  campaigns[date_id] = { ...campaign, deliverables }
  await sb
    .from('tasks')
    .update({ artifact_data: { ...artifact, campaigns } })
    .eq('id', task_id)
}

async function mergeSectionIntoCampaign(
  sb: any,
  task_id: string,
  date_id: string,
  section: Section,
  parsed: any
) {
  const { data } = await sb.from('tasks').select('artifact_data').eq('id', task_id).single()
  const artifact = (data?.artifact_data as any) ?? {}
  const campaigns = artifact.campaigns ?? {}
  const campaign = campaigns[date_id] ?? {}
  const deliverables = campaign.deliverables ?? {}
  const merged: any = { ...campaign }
  if (section === 'copies') merged.copies = parsed.copies ?? parsed
  else if (section === 'email') {
    merged.emailSubject = parsed.subject ?? parsed.emailSubject ?? ''
    merged.emailPreview = parsed.preview ?? parsed.emailPreview ?? ''
    merged.emailBody = parsed.html ?? parsed.emailBody ?? ''
    deliverables.email = {
      status: 'generated',
      generatedAt: new Date().toISOString(),
      data: {
        subject: parsed.subject ?? '',
        preview: parsed.preview ?? '',
        html: parsed.html ?? '',
      },
    }
    merged.deliverables = deliverables
    campaigns[date_id] = merged
    await sb
      .from('tasks')
      .update({ artifact_data: { ...artifact, campaigns } })
      .eq('id', task_id)
    return
  } else if (section === 'assets') merged.assets = parsed.assets ?? parsed
  else if (section === 'video')
    merged.videoScripts = parsed.videoScripts ?? parsed.scripts ?? parsed
  else if (section === 'timeline') merged.timeline = parsed.timeline ?? parsed
  deliverables[section] = { status: 'generated', generatedAt: new Date().toISOString() }
  merged.deliverables = deliverables
  campaigns[date_id] = merged
  await sb
    .from('tasks')
    .update({ artifact_data: { ...artifact, campaigns } })
    .eq('id', task_id)
}

function buildTextPrompt(section: Section, campaign: any): string {
  const ctx = `Conceito já gerado:\n- Slogan: "${campaign.concept.slogan}"\n- Descrição: ${campaign.concept.description}\n- Produtos curados: ${JSON.stringify((campaign.curatedProducts ?? campaign.selectedProducts ?? []).map((p: any) => ({ name: p.name, price: p.price })))}\n`
  if (section === 'copies') {
    return `${ctx}\nGere APENAS copies para redes sociais. JSON em bloco \`\`\`json ... \`\`\`:\n{ "copies": [ { "channel": "instagram|facebook|tiktok|whatsapp|email", "timing": "teaser|lançamento|lembrete|urgência", "text": "string" } ] }\nGere 4-6 copies variando canal e timing. Português BR. Apenas JSON.`
  }
  if (section === 'video') {
    return `${ctx}\nGere APENAS roteiros de vídeo. JSON em bloco \`\`\`json ... \`\`\`:\n{ "videoScripts": [ { "title": "string", "duration": "15s|30s|60s", "content": "roteiro cena a cena" } ] }\nGere 2-3 roteiros curtos. Apenas JSON.`
  }
  return `${ctx}\nGere APENAS a timeline de ativação. JSON em bloco \`\`\`json ... \`\`\`:\n{ "timeline": [ { "day": "D-30|D-21|D-14|D-7|D-3|D-1|D-Day|D+1", "actions": ["ação 1", "ação 2"] } ] }\nGere 5-8 marcos. Apenas JSON.`
}
