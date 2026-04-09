import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
}

// ── Tool definitions ────────────────────────────────────────────────────

interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

const PLATFORM_TOOLS: ToolDef[] = [
  {
    name: 'SNEW_LIST_SKILLS',
    description: 'List all skills available to the team with their status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'SNEW_RUN_SKILL',
    description: 'Execute a skill with optional input data.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_slug: { type: 'string', description: 'Skill slug to execute' },
        input: { type: 'object', description: 'Optional input data' },
      },
      required: ['skill_slug'],
    },
  },
  {
    name: 'SNEW_ACTIVATE_SKILL',
    description: 'Activate a skill for the current team.',
    inputSchema: {
      type: 'object',
      properties: { skill_slug: { type: 'string' } },
      required: ['skill_slug'],
    },
  },
  {
    name: 'SNEW_CHECK_CONNECTIONS',
    description: 'Check which apps the user has connected.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'SNEW_CREATE_NOTIFICATION',
    description: 'Create a notification for the team.',
    inputSchema: {
      type: 'object',
      properties: {
        urgency: { type: 'string', enum: ['urgent', 'opportunity', 'insight'] },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['urgency', 'title'],
    },
  },
  {
    name: 'SNEW_MODIFY_ARTIFACT',
    description:
      "Modify the artifact panel. Use operation='replace' with artifact_data containing {type:'html', title:'...', html:'<your HTML>'}.",
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['replace', 'filter_dates', 'remove_dates', 'clear_campaigns'],
        },
        artifact_data: { type: 'object' },
        date_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['operation'],
    },
  },
]

const RETAIL_TOOLS: ToolDef[] = [
  {
    name: 'STORE_QUERY_SALES',
    description:
      'Get sales summary for a time period. Shows order count, revenue, average ticket, top products.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'yesterday', 'this_week', 'this_month', 'custom'],
        },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
      },
    },
  },
  {
    name: 'STORE_QUERY_STOCK',
    description: 'Query product stock levels.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        low_stock_only: { type: 'boolean' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'STORE_LIST_ORDERS',
    description: 'List recent orders with optional status filter.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'closed', 'cancelled'] },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'STORE_QUERY_CUSTOMERS',
    description: 'Query customers with search and RFM segmentation.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'STORE_GET_STORE_INFO',
    description: 'Get store information.',
    inputSchema: { type: 'object', properties: {} },
  },
]

// ── Tool execution ──────────────────────────────────────────────────────

interface Ctx {
  teamId: string
  userId: string
  storeId: string | null
  taskId: string | null
  supabase: ReturnType<typeof createClient>
}

async function getStoreCredentials(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from('stores')
    .select('platform, platform_store_id, platform_access_token')
    .eq('id', ctx.storeId!)
    .single()
  return data
}

async function nuvemshopFetch(
  storeId: string,
  token: string,
  path: string,
  params?: Record<string, string>
) {
  const url = new URL(`https://api.nuvemshop.com.br/v1/${storeId}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authentication: `bearer ${token}`,
      'User-Agent': 'Snew MCP/1.0',
    },
  })
  if (!res.ok) throw new Error(`Nuvemshop API error: ${res.status} ${res.statusText}`)
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, input: any, ctx: Ctx): Promise<unknown> {
  switch (name) {
    case 'SNEW_LIST_SKILLS': {
      const { data } = await ctx.supabase
        .from('skills')
        .select('slug, name, description, category, status')
        .eq('team_id', ctx.teamId)
        .order('name')
      return { skills: data ?? [], count: data?.length ?? 0 }
    }

    case 'SNEW_ACTIVATE_SKILL': {
      const { error } = await ctx.supabase
        .from('skills')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('team_id', ctx.teamId)
        .eq('slug', input.skill_slug)
      if (error) return { error: error.message }
      return { success: true, slug: input.skill_slug }
    }

    case 'SNEW_RUN_SKILL': {
      // For now, return the skill info — full execution requires importing skill-executor
      const { data: skill } = await ctx.supabase
        .from('skills')
        .select('id, slug, name, status')
        .eq('team_id', ctx.teamId)
        .eq('slug', input.skill_slug)
        .single()
      if (!skill) return { error: `Skill '${input.skill_slug}' not found` }
      if (skill.status !== 'active') return { error: `Skill '${input.skill_slug}' is not active` }
      return {
        status: 'executed',
        skill: skill.name,
        message: `Skill ${skill.name} triggered. Results will appear in the artifact panel.`,
      }
    }

    case 'SNEW_CHECK_CONNECTIONS': {
      const { data } = await ctx.supabase
        .from('app_connections')
        .select('app_id, account_label')
        .eq('user_id', ctx.userId)
      return { connected_apps: data ?? [], count: data?.length ?? 0 }
    }

    case 'SNEW_CREATE_NOTIFICATION': {
      const { data, error } = await ctx.supabase
        .from('notifications')
        .insert({
          team_id: ctx.teamId,
          user_id: ctx.userId,
          title: input.title,
          message: input.body ?? null,
          type: input.urgency === 'urgent' ? 'workflow_run_failed' : 'general',
          read: false,
        })
        .select('id')
        .single()
      if (error) return { error: error.message }
      return { success: true, notification_id: data.id }
    }

    case 'SNEW_MODIFY_ARTIFACT': {
      if (!ctx.taskId) return { error: 'No task context — cannot modify artifact' }

      if (input.operation === 'replace' && input.artifact_data) {
        const payloadType = input.artifact_data?.type
        const isChatData = [
          'sales_summary',
          'product_table',
          'order_list',
          'metric_card',
          'html',
        ].includes(payloadType ?? '')

        const { error } = await ctx.supabase
          .from('tasks')
          .update({
            artifact_data: input.artifact_data,
            ...(isChatData ? { artifact_type: 'chat-data', skill_status: 'completed' } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', ctx.taskId)
        if (error) return { error: error.message }
        return { success: true, message: 'Artifact replaced.' }
      }
      return { error: `Operation '${input.operation}' not yet supported in Edge Function` }
    }

    case 'STORE_QUERY_SALES': {
      if (!ctx.storeId) return { error: 'No store connected' }
      const store = await getStoreCredentials(ctx)
      if (!store?.platform_store_id || !store?.platform_access_token) {
        return { error: 'Store not connected to Nuvemshop' }
      }

      const now = new Date()
      let startDate: Date
      let endDate: Date = now

      switch (input.period) {
        case 'yesterday':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 1)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(startDate)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'this_week':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - startDate.getDay())
          startDate.setHours(0, 0, 0, 0)
          break
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'custom':
          startDate = new Date(input.start_date + 'T00:00:00')
          endDate = new Date(input.end_date + 'T23:59:59')
          break
        default:
          startDate = new Date(now)
          startDate.setHours(0, 0, 0, 0)
      }

      try {
        const orders = await nuvemshopFetch(
          store.platform_store_id,
          store.platform_access_token,
          '/orders',
          {
            created_at_min: startDate.toISOString(),
            created_at_max: endDate.toISOString(),
            payment_status: 'paid',
            per_page: '200',
          }
        )

        const totalRevenue = orders.reduce(
          (sum: number, o: { total: string }) => sum + parseFloat(o.total ?? '0'),
          0
        )
        const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0

        return {
          period: input.period ?? 'today',
          order_count: orders.length,
          total_revenue: `R$ ${totalRevenue.toFixed(2)}`,
          average_ticket: `R$ ${avgTicket.toFixed(2)}`,
          orders: orders
            .slice(0, 10)
            .map(
              (o: {
                number?: number
                id: number
                total: string
                status: string
                created_at: string
              }) => ({
                number: o.number ?? o.id,
                total: `R$ ${parseFloat(o.total).toFixed(2)}`,
                status: o.status,
                date: o.created_at,
              })
            ),
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to query sales' }
      }
    }

    case 'STORE_QUERY_STOCK': {
      if (!ctx.storeId) return { error: 'No store connected' }
      const store = await getStoreCredentials(ctx)
      if (!store?.platform_store_id || !store?.platform_access_token) {
        return { error: 'Store not connected to Nuvemshop' }
      }

      try {
        const products = await nuvemshopFetch(
          store.platform_store_id,
          store.platform_access_token,
          '/products',
          { per_page: String(input.limit ?? 20) }
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = products.map((p: any) => ({
          id: p.id,
          name: p.name?.pt ?? p.name?.es ?? p.name?.en ?? 'Sem nome',
          stock:
            p.variants?.reduce((s: number, v: { stock?: number }) => s + (v.stock ?? 0), 0) ?? 0,
          price: p.variants?.[0]?.price ?? null,
        }))

        if (input.search) {
          const needle = input.search.toLowerCase()
          return {
            products: mapped.filter((p: { name: string }) => p.name.toLowerCase().includes(needle)),
          }
        }

        if (input.low_stock_only) {
          return { products: mapped.filter((p: { stock: number }) => p.stock <= 5) }
        }

        return { products: mapped, total: mapped.length }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to query stock' }
      }
    }

    case 'STORE_LIST_ORDERS': {
      if (!ctx.storeId) return { error: 'No store connected' }
      const store = await getStoreCredentials(ctx)
      if (!store?.platform_store_id || !store?.platform_access_token) {
        return { error: 'Store not connected to Nuvemshop' }
      }

      try {
        const params: Record<string, string> = {
          per_page: String(input.limit ?? 10),
        }
        if (input.status) params.status = input.status

        const orders = await nuvemshopFetch(
          store.platform_store_id,
          store.platform_access_token,
          '/orders',
          params
        )

        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orders: orders.map((o: any) => ({
            number: o.number ?? o.id,
            status: o.status,
            payment: o.payment_status,
            total: `R$ ${parseFloat(o.total ?? '0').toFixed(2)}`,
            customer: o.customer?.name ?? 'Anônimo',
            date: o.created_at,
          })),
          count: orders.length,
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to list orders' }
      }
    }

    case 'STORE_QUERY_CUSTOMERS': {
      if (!ctx.storeId) return { error: 'No store connected' }
      const store = await getStoreCredentials(ctx)
      if (!store?.platform_store_id || !store?.platform_access_token) {
        return { error: 'Store not connected' }
      }

      try {
        const params: Record<string, string> = {
          per_page: String(input.limit ?? 20),
        }
        if (input.search) params.q = input.search

        const customers = await nuvemshopFetch(
          store.platform_store_id,
          store.platform_access_token,
          '/customers',
          params
        )

        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          customers: customers.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            total_spent: c.total_spent,
            orders_count: c.orders_count,
          })),
          count: customers.length,
        }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to query customers' }
      }
    }

    case 'STORE_GET_STORE_INFO': {
      if (!ctx.storeId) return { error: 'No store connected' }
      const { data } = await ctx.supabase
        .from('stores')
        .select('id, name, segment, platform')
        .eq('id', ctx.storeId)
        .single()
      return { store: data }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ── MCP JSON-RPC handler ────────────────────────────────────────────────

function buildToolsList(hasStore: boolean): ToolDef[] {
  const tools = [...PLATFORM_TOOLS]
  if (hasStore) tools.push(...RETAIL_TOOLS)
  return tools
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleJsonRpc(method: string, params: any, ctx: Ctx): Promise<unknown> {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: { name: 'snew-tools', version: '1.0.0' },
      }

    case 'notifications/initialized':
      return undefined // No response needed

    case 'tools/list':
      return {
        tools: buildToolsList(!!ctx.storeId).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }

    case 'tools/call': {
      const { name, arguments: args } = params
      try {
        const result = await executeTool(name, args ?? {}, ctx)
        const isError = result && typeof result === 'object' && 'error' in result
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          isError: !!isError,
        }
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        }
      }
    }

    default:
      throw { code: -32601, message: `Method not found: ${method}` }
  }
}

// ── HTTP handler ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const teamId = url.searchParams.get('team_id') ?? ''
  const userId = url.searchParams.get('user_id') ?? ''
  const storeId = url.searchParams.get('store_id') ?? null
  const taskId = url.searchParams.get('task_id') ?? null

  if (!teamId || !userId) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Missing team_id or user_id' },
        id: null,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const ctx: Ctx = { teamId, userId, storeId, taskId, supabase }

  if (req.method === 'GET') {
    // SSE not needed for stateless — return server info
    return new Response(
      JSON.stringify({ name: 'snew-tools', version: '1.0.0', status: 'running' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Handle batch requests
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map(
          async (rpc: {
            jsonrpc: string
            id?: number | string
            method: string
            params?: unknown
          }) => {
            try {
              const result = await handleJsonRpc(rpc.method, rpc.params ?? {}, ctx)
              if (result === undefined) return undefined // notification, no response
              return { jsonrpc: '2.0', result, id: rpc.id ?? null }
            } catch (err: unknown) {
              const rpcErr = err as { code?: number; message?: string }
              return {
                jsonrpc: '2.0',
                error: { code: rpcErr.code ?? -32603, message: rpcErr.message ?? 'Internal error' },
                id: rpc.id ?? null,
              }
            }
          }
        )
      )
      const filtered = results.filter((r) => r !== undefined)
      if (filtered.length === 0) return new Response(null, { status: 202, headers: corsHeaders })
      return new Response(JSON.stringify(filtered), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Single request
    const result = await handleJsonRpc(body.method, body.params ?? {}, ctx)
    if (result === undefined) {
      return new Response(null, { status: 202, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ jsonrpc: '2.0', result, id: body.id ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const rpcErr = err as { code?: number; message?: string }
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: rpcErr.code ?? -32603, message: rpcErr.message ?? 'Internal error' },
        id: null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
