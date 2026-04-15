/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeError } from '@/lib/safe-error'
import { getComposio } from '@/lib/composio/client'
import { getAvailableApps } from '@/lib/composio/actions/get-available-apps'
import { getStoreConnection } from '@/lib/studio/ecommerce-connection'
import { invokeTool } from '@/lib/chat/tools-client'

/**
 * POST /api/studio/tools — Server-side executor for the `snew_*` actions
 * emitted by the studio-chat edge function.
 *
 * Body: { action: string, params?: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as {
    action?: string
    params?: Record<string, unknown>
  }
  const action = body.action ?? ''
  const params = body.params ?? {}

  // Resolved once per request — every gating check + retail dispatch reads
  // from this discriminator (FR-001 of spec 069).
  const ecommerce = await getStoreConnection(teamId, user.id)

  try {
    switch (action) {
      case 'snew_check_connections':
        return NextResponse.json(await checkConnections(user.id, ecommerce))
      case 'snew_list_available_apps':
        return NextResponse.json(await listAvailableApps(user.id))
      case 'snew_connect_app': {
        const app = (params.app as string) ?? ''
        if (!app) return NextResponse.json({ error: 'app is required' }, { status: 400 })
        if (app.toLowerCase() === 'shopify' && ecommerce.kind === 'nuvemshop') {
          return NextResponse.json(ecommerceAlreadyConnectedError('connect', app), { status: 409 })
        }
        return NextResponse.json(await connectApp(user.id, app))
      }
      case 'snew_query_sales':
        return NextResponse.json(
          await runRetailTool(teamId, user.id, ecommerce, 'STORE_QUERY_SALES', params)
        )
      case 'snew_query_stock':
        return NextResponse.json(
          await runRetailTool(teamId, user.id, ecommerce, 'STORE_QUERY_STOCK', params)
        )
      case 'snew_list_orders':
        return NextResponse.json(
          await runRetailTool(teamId, user.id, ecommerce, 'STORE_LIST_ORDERS', params)
        )
      case 'snew_run_skill': {
        const slug = (params.slug as string) ?? ''
        if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })
        return NextResponse.json(await runSkill(teamId, user.id, slug, params))
      }
      case 'snew_post_to_app': {
        const app = (params.app as string) ?? ''
        const imageUrl = (params.imageUrl as string) ?? ''
        const caption = (params.caption as string) ?? ''
        if (!app || !imageUrl) {
          return NextResponse.json({ error: 'app and imageUrl are required' }, { status: 400 })
        }
        if (app.toLowerCase() === 'shopify' && ecommerce.kind === 'nuvemshop') {
          return NextResponse.json(ecommerceAlreadyConnectedError('post', app), { status: 409 })
        }
        return NextResponse.json(await postToApp(user.id, app, imageUrl, caption))
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeError('studio-tools', error, 'Tool execution failed') },
      { status: 500 }
    )
  }
}

async function checkConnections(
  userId: string,
  ecommerce?: Awaited<ReturnType<typeof getStoreConnection>>
) {
  // STRICT Composio-only — no local cache fallback. If a connection doesn't
  // exist in Composio, we can't post/query through it, so surfacing a cached
  // row would be misleading.
  const composio = getComposio()
  const { items } = await composio.connectedAccounts.list({ userIds: [userId] })
  const apps = (
    items as Array<{
      id: string
      status: string
      toolkit?: { slug?: string }
      state?: { authScheme?: string }
    }>
  )
    .filter((a) => a.status === 'ACTIVE')
    .map((acc) => ({
      app_id: acc.toolkit?.slug?.toLowerCase() ?? 'unknown',
      connected_account_id: acc.id,
      auth_type: acc.state?.authScheme ?? 'unknown',
    }))
  return {
    connected_apps: apps,
    count: apps.length,
    // FR-011 (spec 069): the AI must know which e-commerce backend is in use
    // so it doesn't suggest connecting Composio Shopify to a Nuvemshop team.
    ecommerce: ecommerce ? { kind: ecommerce.kind } : { kind: null },
  }
}

function ecommerceAlreadyConnectedError(intent: 'connect' | 'post', app: string) {
  return {
    error_code: 'ECOMMERCE_ALREADY_CONNECTED',
    intent,
    requested_app: app,
    active_kind: 'nuvemshop',
    message:
      intent === 'connect'
        ? 'Sua loja já está conectada via Nuvemshop — não é necessário (nem permitido) conectar Shopify pelo Composio. Use as ferramentas de loja (estoque, vendas, pedidos) diretamente.'
        : 'Publicação de Shopify pelo Composio está bloqueada porque sua loja já é Nuvemshop. Posts são pra redes sociais (Instagram, TikTok, etc.); para a loja, use os tools de produto/estoque.',
  }
}

/**
 * Delegate retail queries (`snew_query_*` / `snew_list_orders`) to the **same
 * MCP edge function** the OLD chat already uses (`STORE_QUERY_SALES`,
 * `STORE_QUERY_STOCK`, `STORE_LIST_ORDERS`). No reimplementation — we only
 * change the transport from `/api/chat` → `/api/studio/tools`.
 */
async function runRetailTool(
  teamId: string,
  userId: string,
  ecommerce: Awaited<ReturnType<typeof getStoreConnection>>,
  toolName: 'STORE_QUERY_SALES' | 'STORE_QUERY_STOCK' | 'STORE_LIST_ORDERS',
  params: Record<string, unknown>
) {
  if (ecommerce.kind !== 'nuvemshop') {
    return {
      error_code: 'ECOMMERCE_NOT_CONNECTED',
      message:
        'Para responder essa pergunta preciso de uma loja conectada. Conecte a Nuvemshop em Apps para liberar consultas de estoque, vendas e pedidos.',
    }
  }

  try {
    const result = await invokeTool({
      name: toolName,
      input: params ?? {},
      context: {
        teamId,
        userId,
        storeId: ecommerce.storeId,
      },
    })
    const text = result.content[0]?.text ?? '{}'
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(text) as Record<string, unknown>
    } catch {
      return { raw: text }
    }
    try {
      // Synthesize the side-panel artifact when the deployed MCP function
      // didn't include an artifact field in its response. Use a plain key
      // (not `__artifact`) — Next.js / JSON.stringify occasionally treats
      // double-underscore prefixes specially in its runtime.
      if (!parsed.artifact && !parsed.__artifact) {
        const synth = synthesizeRetailArtifact(toolName, parsed)
        if (synth) parsed.artifact = synth
      }
    } catch (synthErr) {
      console.error('[studio/tools] synthesize failed:', synthErr)
    }
    return parsed
  } catch (e) {
    const msg = (e as Error)?.message ?? 'unknown'
    if (/401|403|invalid/i.test(msg)) {
      return {
        error_code: 'NUVEMSHOP_AUTH_EXPIRED',
        message:
          'Sua autorização Nuvemshop expirou. Reconecte em Apps para continuar usando os tools de loja.',
        reauth_url: '/api/nuvemshop/connect',
      }
    }
    return {
      error_code: 'RETAIL_TOOL_FAILED',
      tool: toolName,
      message: msg,
    }
  }
}

function escHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Build the side-panel artifact when the deployed MCP function only returned
 * the raw fields (older mcp-tools deploy). This is a fallback so the studio
 * side panel still gets a polished card; once mcp-tools is redeployed with
 * its own `__artifact` block, this is a no-op (the field is already present).
 */
function synthesizeRetailArtifact(
  toolName: 'STORE_QUERY_SALES' | 'STORE_QUERY_STOCK' | 'STORE_LIST_ORDERS',
  payload: Record<string, unknown>
): { type: string; title: string; html: string; data: unknown } | null {
  if (toolName === 'STORE_QUERY_SALES') {
    const period = String(payload.period ?? 'today')
    const periodLabel =
      period === 'today'
        ? 'Hoje'
        : period === 'yesterday'
          ? 'Ontem'
          : period === 'this_week'
            ? 'Esta semana'
            : period === 'this_month'
              ? 'Este mês'
              : 'Período'
    const html = `
      <div class="section">
        <div class="h1 mb-4">Resumo de vendas — ${escHtml(periodLabel)}</div>
        <div class="grid-3">
          <div class="card-elevated stat">
            <span class="value tabular">${escHtml(payload.total_revenue ?? '—')}</span>
            <span class="label">Receita</span>
          </div>
          <div class="card-elevated stat">
            <span class="value tabular">${escHtml(payload.order_count ?? 0)}</span>
            <span class="label">Pedidos pagos</span>
          </div>
          <div class="card-elevated stat">
            <span class="value tabular">${escHtml(payload.average_ticket ?? '—')}</span>
            <span class="label">Ticket médio</span>
          </div>
        </div>
      </div>`
    return { type: 'chat-data', title: `Vendas — ${periodLabel}`, html, data: { ...payload } }
  }
  if (toolName === 'STORE_QUERY_STOCK') {
    const items = (payload.products ?? payload.items ?? []) as Array<Record<string, unknown>>
    const rows = items
      .slice(0, 50)
      .map(
        (it) =>
          `<tr><td>${escHtml(it.name ?? '—')}</td><td class="tabular">${escHtml(it.stock ?? it.total_stock ?? 0)}</td></tr>`
      )
      .join('')
    const html = `
      <div class="section">
        <div class="h1 mb-4">Estoque (${items.length} produto${items.length === 1 ? '' : 's'})</div>
        <div class="card-elevated"><table class="table"><thead><tr><th>Produto</th><th>Estoque</th></tr></thead><tbody>${rows || '<tr><td colspan="2">Sem itens.</td></tr>'}</tbody></table></div>
      </div>`
    return { type: 'chat-data', title: `Estoque (${items.length})`, html, data: { ...payload } }
  }
  if (toolName === 'STORE_LIST_ORDERS') {
    const orders = (payload.orders ?? []) as Array<Record<string, unknown>>
    const rows = orders
      .slice(0, 30)
      .map(
        (o) =>
          `<tr><td>#${escHtml(o.number ?? o.id ?? '')}</td><td>${escHtml(o.customer ?? o.customer_name ?? '—')}</td><td class="tabular">${escHtml(o.total ?? 0)}</td><td>${escHtml(o.status ?? '')}</td></tr>`
      )
      .join('')
    const html = `
      <div class="section">
        <div class="h1 mb-4">Pedidos recentes (${orders.length})</div>
        <div class="card-elevated"><table class="table"><thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Sem pedidos.</td></tr>'}</tbody></table></div>
      </div>`
    return {
      type: 'chat-data',
      title: `Pedidos recentes (${orders.length})`,
      html,
      data: { ...payload },
    }
  }
  return null
}

async function listAvailableApps(userId: string) {
  try {
    const available = await getAvailableApps()
    const connected = await checkConnections(userId)
    const connectedIds = new Set(
      connected.connected_apps.map((a: { app_id: string }) => a.app_id.toLowerCase())
    )
    const apps = available.map((app) => ({
      app_id: app.id,
      integration_id: app.integrationId,
      name: app.name,
      connected: connectedIds.has(app.id),
    }))
    return {
      total: apps.length,
      connected_count: apps.filter((a) => a.connected).length,
      apps,
    }
  } catch (error) {
    return {
      total: 0,
      apps: [],
      error: `Failed to fetch Composio apps: ${String((error as Error)?.message ?? '')}`,
    }
  }
}

// Map user-friendly names to the toolkit slugs that actually exist in
// this workspace's Composio account. STRICT — an alias only counts when the
// capability is actually equivalent. `metaads` runs ad campaigns, NOT organic
// Instagram posts, so it is NOT an alias for `instagram`.
const APP_ALIASES: Record<string, string[]> = {
  instagram: ['instagram', 'instagram_graph', 'instagram_business'],
  facebook: ['facebook', 'facebook_page', 'facebook_graph'],
  meta_ads: ['metaads', 'meta_ads'],
  metaads: ['metaads', 'meta_ads'],
  x: ['twitter', 'x'],
  twitter: ['twitter', 'x'],
  youtube: ['youtube', 'youtube_data'],
  linkedin: ['linkedin'],
  tiktok: ['tiktok'],
  shopify: ['shopify'],
  gmail: ['gmail'],
  whatsapp: ['whatsapp'],
  slack: ['slack'],
  discord: ['discord', 'discordbot'],
  pinterest: ['pinterest'],
  notion: ['notion'],
  trello: ['trello'],
}

function resolveAppSlug(input: string, availableSlugs: Set<string>): string | null {
  const lower = input.toLowerCase()
  const candidates = APP_ALIASES[lower] ?? [lower]
  for (const c of candidates) {
    if (availableSlugs.has(c)) return c
  }
  // Fuzzy: any slug that starts with the requested name
  for (const slug of availableSlugs) {
    if (slug.startsWith(lower) || lower.startsWith(slug)) return slug
  }
  return null
}

async function connectApp(userId: string, app: string) {
  try {
    const composio = getComposio()

    // Short-circuit: if this exact toolkit (or a strict alias) is already
    // active, don't start a new OAuth flow.
    const { items: connectedItems } = await composio.connectedAccounts.list({ userIds: [userId] })
    const activeConnected = (
      connectedItems as Array<{
        status: string
        toolkit?: { slug?: string }
      }>
    )
      .filter((a) => a.status === 'ACTIVE')
      .map((a) => a.toolkit?.slug?.toLowerCase() ?? '')
      .filter(Boolean)
    const alreadyConnected = resolveAppSlug(app, new Set(activeConnected))
    if (alreadyConnected) {
      return {
        app,
        resolved: alreadyConnected,
        already_connected: true,
        hint: `${app} já está conectado via ${alreadyConnected}.`,
      }
    }

    const toolkitSlug = app.toLowerCase()

    // 1) Find an existing authConfig for this toolkit, or create one with
    //    Composio-managed auth. This is required before we can call .link().
    const { items: existingConfigs } = await composio.authConfigs.list()
    let authConfigId = (existingConfigs as Array<{ id: string; toolkit?: { slug?: string } }>).find(
      (c) => c.toolkit?.slug?.toLowerCase() === toolkitSlug
    )?.id

    if (!authConfigId) {
      try {
        const created = (await composio.authConfigs.create(toolkitSlug, {
          type: 'use_composio_managed_auth',
          name: `${app} (managed)`,
        } as any)) as { id?: string }
        authConfigId = created?.id
      } catch (error) {
        return {
          app,
          error: `Falha ao criar authConfig para ${app}: ${String(
            (error as Error)?.message ?? ''
          )}`,
        }
      }
    }

    if (!authConfigId) {
      return { app, error: 'Não foi possível obter o authConfig para esse app.' }
    }

    // 2) Create the hosted Connect Link — this returns the Snew-branded
    //    transition URL at `platform.composio.dev/link/lk_...`.

    const link =
      (composio.connectedAccounts as any).link?.bind(composio.connectedAccounts) ??
      (
        composio.connectedAccounts as unknown as {
          initiate: (userId: string, id: string) => Promise<unknown>
        }
      ).initiate.bind(composio.connectedAccounts)

    const connectionRequest = (await link(userId, authConfigId)) as {
      id?: string
      redirectUrl?: string
      redirectUri?: string
    }
    const redirectUrl = connectionRequest?.redirectUrl ?? connectionRequest?.redirectUri ?? null
    if (!redirectUrl) {
      return { app, error: 'Composio não retornou URL de conexão.' }
    }

    return {
      app,
      resolved: toolkitSlug,
      connect_url: redirectUrl,
      connection_request_id: connectionRequest?.id,
      hint: `Abrindo autorização do ${app}. Conclua na janela que abriu e volte ao studio.`,
    }
  } catch (error) {
    return {
      app,
      error: `Falha ao iniciar conexão: ${String((error as Error)?.message ?? '')}`,
    }
  }
}

// Retail stubs (querySales/queryStock/listOrders) were replaced by
// `runRetailTool` above — see spec 069 FR-002. The OLD chat's MCP tools
// (STORE_QUERY_SALES / STORE_QUERY_STOCK / STORE_LIST_ORDERS) are reused
// verbatim through `invokeTool`.

async function uploadImageIfDataUrl(userId: string, imageUrl: string): Promise<string> {
  if (!imageUrl.startsWith('data:')) return imageUrl
  const match = imageUrl.match(/^data:([^;]+);base64,(.*)$/)
  if (!match) return imageUrl
  const mimeType = match[1]
  const b64 = match[2]
  const ext = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
      ? 'webp'
      : mimeType.includes('gif')
        ? 'gif'
        : 'jpg'
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const path = `${userId}/studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const supabase = createServiceRoleClient()
  const { error } = await supabase.storage
    .from('chat-uploads')
    .upload(path, bytes, { contentType: mimeType, upsert: false })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data } = supabase.storage.from('chat-uploads').getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('No public URL returned from storage')
  return data.publicUrl
}

async function postToApp(userId: string, app: string, imageUrl: string, caption: string) {
  try {
    // Instagram / most social APIs require a PUBLIC https URL for the image.
    // If the canvas passed a base64 data URL, upload to Supabase Storage first.
    let publicImageUrl = imageUrl
    try {
      publicImageUrl = await uploadImageIfDataUrl(userId, imageUrl)
    } catch (uploadError) {
      return {
        ok: false,
        error: `Falha ao preparar imagem para o post: ${String((uploadError as Error)?.message ?? '')}`,
      }
    }
    const composio = getComposio()
    const { items } = await composio.connectedAccounts.list({ userIds: [userId] })
    const active = (
      items as Array<{ id: string; status: string; toolkit?: { slug?: string } }>
    ).filter((a) => a.status === 'ACTIVE')
    const connectedSlugs = new Set(
      active.map((a) => a.toolkit?.slug?.toLowerCase() ?? '').filter(Boolean)
    )
    const resolvedSlug = resolveAppSlug(app, connectedSlugs)
    if (!resolvedSlug) {
      return {
        ok: false,
        error: `${app} não está conectado neste workspace. Conecte primeiro.`,
        connected_apps: Array.from(connectedSlugs),
      }
    }
    const account = active.find((a) => a.toolkit?.slug?.toLowerCase() === resolvedSlug)
    if (!account) {
      return { ok: false, error: `Nenhuma conta ativa para ${resolvedSlug}.` }
    }

    // Composio v2 SDK tool slugs vary by toolkit. Common examples:
    //   instagram: INSTAGRAM_CREATE_MEDIA_CONTAINER + INSTAGRAM_PUBLISH_MEDIA
    //   x / twitter: TWITTER_CREATION_OF_A_POST
    //   linkedin: LINKEDIN_CREATE_POST
    // We surface the first matching tool heuristic; the AI and client see the
    // outcome and can branch.

    const toolsApi = (composio as any).tools
    if (!toolsApi?.execute) {
      return {
        ok: false,
        error: 'Composio SDK não expõe tools.execute nesta versão.',
      }
    }

    // Common Composio tool slugs per platform. We try them in order until one
    // succeeds — different toolkits ship with slightly different slugs.
    // Instagram: 2-step flow with non-deprecated slugs.
    if (resolvedSlug === 'instagram') {
      try {
        // Step 0: get the Instagram business user id (required by POST_IG_USER_MEDIA).
        const infoResult = await toolsApi.execute('INSTAGRAM_GET_USER_INFO', {
          userId,
          connectedAccountId: account.id,
          arguments: {},
          dangerouslySkipVersionCheck: true,
        })
        if (!infoResult?.successful) {
          return {
            ok: false,
            error: `INSTAGRAM_GET_USER_INFO falhou: ${String(infoResult?.error ?? 'unknown')}`,
          }
        }
        const igUserId =
          infoResult?.data?.id ?? infoResult?.data?.ig_user_id ?? infoResult?.data?.user?.id
        if (!igUserId) {
          return {
            ok: false,
            error: 'Não encontrei ig_user_id na conta Instagram conectada.',
            info: infoResult?.data,
          }
        }

        const createResult = await toolsApi.execute('INSTAGRAM_POST_IG_USER_MEDIA', {
          userId,
          connectedAccountId: account.id,
          arguments: {
            ig_user_id: String(igUserId),
            image_url: publicImageUrl,
            caption,
            // media_type omitted for single photos — valid values are only
            // REELS/CAROUSEL/STORIES, everything else = regular image post.
          },
          dangerouslySkipVersionCheck: true,
        })
        if (!createResult?.successful) {
          return {
            ok: false,
            error: `INSTAGRAM_POST_IG_USER_MEDIA falhou: ${String(createResult?.error ?? 'unknown')}`,
          }
        }
        const containerId =
          createResult?.data?.id ??
          createResult?.data?.container_id ??
          createResult?.data?.creation_id
        if (!containerId) {
          return {
            ok: false,
            error: 'Container criado mas sem id retornado.',
            createData: createResult?.data,
          }
        }
        const publishResult = await toolsApi.execute('INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH', {
          userId,
          connectedAccountId: account.id,
          arguments: {
            ig_user_id: String(igUserId),
            creation_id: containerId,
          },
          dangerouslySkipVersionCheck: true,
        })
        if (!publishResult?.successful) {
          return {
            ok: false,
            error: `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH falhou: ${String(publishResult?.error ?? 'unknown')}`,
          }
        }
        return { ok: true, app, data: publishResult.data }
      } catch (e) {
        return { ok: false, error: String((e as Error)?.message ?? 'unknown') }
      }
    }

    // Other platforms: single-call slugs.
    const slugsByApp: Record<string, { slug: string; args: Record<string, unknown> }> = {
      twitter: {
        slug: 'TWITTER_CREATION_OF_A_POST',
        args: { text: caption, media_urls: [publicImageUrl] },
      },
      linkedin: {
        slug: 'LINKEDIN_CREATE_POST',
        args: { text: caption, media_url: publicImageUrl },
      },
    }
    const attempt = slugsByApp[resolvedSlug] ?? slugsByApp[app.toLowerCase()]
    if (!attempt) {
      return { ok: false, error: `Ainda não suportamos post direto em ${app}.` }
    }
    try {
      const result = await toolsApi.execute(attempt.slug, {
        userId,
        connectedAccountId: account.id,
        arguments: attempt.args,
        dangerouslySkipVersionCheck: true,
      })
      if (result?.successful) {
        return { ok: true, app, slug: attempt.slug, data: result.data }
      }
      return {
        ok: false,
        error: `${attempt.slug} falhou: ${String(result?.error ?? 'unknown')}`,
      }
    } catch (e) {
      return { ok: false, error: String((e as Error)?.message ?? 'unknown') }
    }
  } catch (error) {
    return {
      ok: false,
      error: `Falha ao publicar em ${app}: ${String((error as Error)?.message ?? '')}`,
    }
  }
}

async function runSkill(
  teamId: string,
  userId: string,
  slug: string,
  params: Record<string, unknown>
) {
  const serviceClient = createServiceRoleClient()
  const title = ((params.title as string) ?? slug).slice(0, 60)

  const { data, error } = await (serviceClient as any).rpc('create_task_with_conversation', {
    p_team_id: teamId,
    p_user_id: userId,
    p_title: title,
    p_initial_message: (params.message as string) ?? `Run skill: ${slug}`,
  })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row?.task_id) {
    return { error: 'Failed to create skill task', detail: String(error ?? 'no task id') }
  }

  await (serviceClient as any)
    .from('tasks')
    .update({ selected_skill: slug, active_skill: slug, skill_status: 'running' })
    .eq('id', row.task_id)

  return {
    slug,
    task_id: row.task_id,
    conversation_id: row.conversation_id,
    redirect_url: `/studio/create/${row.task_id}`,
  }
}
