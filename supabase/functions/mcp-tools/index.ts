/* eslint-disable @typescript-eslint/no-explicit-any */
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.29.0/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.29.0/server/webStandardStreamableHttp.js'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { z } from 'npm:zod@3.24.0'

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      },
    })
  }

  // Parse context from query params
  const url = new URL(req.url)
  const teamId = url.searchParams.get('team_id') ?? ''
  const userId = url.searchParams.get('user_id') ?? ''
  const storeId = url.searchParams.get('store_id') ?? null
  const taskId = url.searchParams.get('task_id') ?? null

  if (!teamId || !userId) {
    return new Response('Missing team_id or user_id', { status: 400 })
  }

  // Security: validate MCP auth token
  const secret = url.searchParams.get('secret')
  const expectedSecret = Deno.env.get('MCP_AUTH_TOKEN')
  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // Create MCP server
  const server = new McpServer({ name: 'snew-tools', version: '1.0.0' })

  // ── Register tools ────────────────────────────────────────────────

  server.registerTool(
    'SNEW_LIST_SKILLS',
    {
      description: 'List all skills available to the team with their status.',
      inputSchema: z.object({}),
    },
    async () => {
      const { data } = await supabase
        .from('skills')
        .select('slug, name, description, category, status')
        .eq('team_id', teamId)
        .order('name')
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ skills: data ?? [], count: data?.length ?? 0 }),
          },
        ],
      }
    }
  )

  server.registerTool(
    'SNEW_RUN_SKILL',
    {
      description: 'Execute a skill with optional input data.',
      inputSchema: z.object({
        skill_slug: z.string(),
        input: z.record(z.string(), z.unknown()).optional(),
      }),
    },
    async ({ skill_slug }) => {
      const { data: skill } = await supabase
        .from('skills')
        .select('id, slug, name, status')
        .eq('team_id', teamId)
        .eq('slug', skill_slug)
        .single()
      if (!skill)
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Skill not found' }) }],
          isError: true,
        }
      if (skill.status !== 'active')
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Skill not active' }) }],
          isError: true,
        }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ status: 'executed', skill: skill.name }),
          },
        ],
      }
    }
  )

  server.registerTool(
    'SNEW_CHECK_CONNECTIONS',
    {
      description: 'Check which apps the user has connected.',
      inputSchema: z.object({}),
    },
    async () => {
      const { data } = await supabase
        .from('app_connections')
        .select('app_id, account_label')
        .eq('user_id', userId)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ connected_apps: data ?? [], count: data?.length ?? 0 }),
          },
        ],
      }
    }
  )

  server.registerTool(
    'SNEW_CREATE_NOTIFICATION',
    {
      description: 'Create a notification for the team.',
      inputSchema: z.object({
        urgency: z.enum(['urgent', 'opportunity', 'insight']),
        title: z.string(),
        body: z.string().optional(),
      }),
    },
    async ({ urgency, title, body }) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          team_id: teamId,
          user_id: userId,
          title,
          message: body ?? null,
          type: urgency === 'urgent' ? 'workflow_run_failed' : 'general',
          read: false,
        })
        .select('id')
        .single()
      if (error)
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: error.message }) }],
          isError: true,
        }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, notification_id: data.id }),
          },
        ],
      }
    }
  )

  server.registerTool(
    'SNEW_MODIFY_ARTIFACT',
    {
      description:
        "Modify the artifact panel. Use operation='replace' with artifact_data containing {type:'html', title:'...', html:'<your HTML>'}.",
      inputSchema: z.object({
        operation: z.enum(['replace', 'filter_dates', 'remove_dates', 'clear_campaigns']),
        artifact_data: z.record(z.string(), z.unknown()).optional(),
        date_ids: z.array(z.string()).optional(),
      }),
    },
    async ({ operation, artifact_data }) => {
      if (!taskId)
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No task context' }) }],
          isError: true,
        }
      if (operation === 'replace' && artifact_data) {
        const t = (artifact_data as Record<string, unknown>)?.type as string | undefined
        const cd = ['sales_summary', 'product_table', 'order_list', 'metric_card', 'html'].includes(
          t ?? ''
        )
        const { error } = await supabase
          .from('tasks')
          .update({
            artifact_data,
            ...(cd ? { artifact_type: 'chat-data', skill_status: 'completed' } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)
        if (error)
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: error.message }) }],
            isError: true,
          }
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] }
      }
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify({ error: 'Unsupported operation' }) },
        ],
        isError: true,
      }
    }
  )

  // ── Composio tools (app connections) ────────────────────────────────

  const composioApiKey = Deno.env.get('COMPOSIO_API_KEY')

  if (composioApiKey) {
    const composioFetch = async (path: string, options?: RequestInit) => {
      const r = await fetch(`https://backend.composio.dev/api/v2${path}`, {
        ...options,
        headers: {
          'x-api-key': composioApiKey,
          'Content-Type': 'application/json',
          ...(options?.headers ?? {}),
        },
      })
      if (!r.ok) throw new Error(`Composio API ${r.status}`)
      return r.json()
    }

    server.registerTool(
      'SNEW_LIST_AVAILABLE_APPS',
      {
        description: 'List all apps available for connection, with status of which are connected.',
        inputSchema: z.object({}),
      },
      async () => {
        try {
          const [connected, apps] = await Promise.all([
            composioFetch(`/connectedAccounts?user_id=${userId}&status=ACTIVE`),
            supabase.from('app_connections').select('app_id').eq('user_id', userId),
          ])
          const connectedIds = new Set(
            (connected.items ?? []).map((a: any) => a.toolkit?.slug?.toLowerCase())
          )
          const available = [
            'instagram',
            'gmail',
            'google-calendar',
            'meta-ads',
            'shopify',
            'slack',
            'whatsapp',
            'telegram',
            'tiktok',
            'youtube',
            'linkedin',
            'twitter',
            'pinterest',
            'discord',
            'notion',
            'trello',
          ]
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  apps: available.map((a) => ({ app_id: a, connected: connectedIds.has(a) })),
                  connected_count: connectedIds.size,
                }),
              },
            ],
          }
        } catch (e) {
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ error: (e as Error).message }) },
            ],
            isError: true,
          }
        }
      }
    )

    server.registerTool(
      'SNEW_CONNECT_APP',
      {
        description:
          'Generate an OAuth connection URL for a third-party app. Returns a URL the user must click to authorize. ALWAYS include this URL in your response as a clickable link.',
        inputSchema: z.object({
          app_id: z.string().describe('App to connect (e.g. "instagram", "gmail", "meta-ads")'),
        }),
      },
      async ({ app_id }) => {
        try {
          // Get auth config for this app
          const configs = await composioFetch('/authConfigs')
          const items = configs.items ?? []
          let authConfigId: string | null = null
          for (const item of items) {
            if (item.toolkit?.slug?.toLowerCase() === app_id.toLowerCase()) {
              // Prefer OAUTH2 over API_KEY
              if (!authConfigId || item.authScheme === 'OAUTH2') {
                authConfigId = item.id
              }
            }
          }
          if (!authConfigId)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: `No auth config for ${app_id}. Set up in Composio dashboard first.`,
                  }),
                },
              ],
              isError: true,
            }

          // Initiate connection
          const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.snew.com.br'
          const connection = await composioFetch('/connectedAccounts', {
            method: 'POST',
            body: JSON.stringify({
              auth_config: { id: authConfigId },
              connection: {
                callback_url: `${siteUrl}/api/apps/callback`,
                user_id: userId,
                allow_multiple: true,
              },
            }),
          })
          const redirectUrl =
            connection.connectionData?.val?.redirectUrl ?? connection.redirectUrl ?? connection.url
          if (!redirectUrl)
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({ error: 'Failed to get OAuth URL' }),
                },
              ],
              isError: true,
            }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  app_id,
                  redirect_url: redirectUrl,
                  message: `Click the link to connect ${app_id}: ${redirectUrl}`,
                }),
              },
            ],
          }
        } catch (e) {
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ error: (e as Error).message }) },
            ],
            isError: true,
          }
        }
      }
    )
  }

  // Retail tools (only if store connected)
  if (storeId) {
    const getStore = async () => {
      const { data } = await supabase
        .from('stores')
        .select('platform, platform_store_id, platform_access_token')
        .eq('id', storeId)
        .single()
      return data
    }

    const nuvemFetch = async (
      sid: string,
      token: string,
      path: string,
      params?: Record<string, string>
    ) => {
      const u = new URL(`https://api.nuvemshop.com.br/v1/${sid}${path}`)
      if (params) for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
      const r = await fetch(u.toString(), {
        headers: { Authentication: `bearer ${token}`, 'User-Agent': 'Snew/1.0' },
      })
      if (!r.ok) throw new Error(`Nuvemshop ${r.status} ${r.statusText}`)
      return r.json()
    }

    server.registerTool(
      'STORE_QUERY_SALES',
      {
        description: 'Get sales summary for a time period.',
        inputSchema: z.object({
          period: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'custom']).optional(),
          start_date: z.string().optional(),
          end_date: z.string().optional(),
        }),
      },
      async ({ period, start_date, end_date }) => {
        const s = await getStore()
        if (!s?.platform_store_id || !s?.platform_access_token)
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ error: 'Store not connected' }) },
            ],
            isError: true,
          }
        const now = new Date()
        let sd: Date
        let ed: Date = now
        switch (period) {
          case 'yesterday':
            sd = new Date(now)
            sd.setDate(sd.getDate() - 1)
            sd.setHours(0, 0, 0, 0)
            ed = new Date(sd)
            ed.setHours(23, 59, 59, 999)
            break
          case 'this_week':
            sd = new Date(now)
            sd.setDate(sd.getDate() - sd.getDay())
            sd.setHours(0, 0, 0, 0)
            break
          case 'this_month':
            sd = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          case 'custom':
            sd = new Date((start_date ?? '') + 'T00:00:00')
            ed = new Date((end_date ?? '') + 'T23:59:59')
            break
          default:
            sd = new Date(now)
            sd.setHours(0, 0, 0, 0)
        }
        try {
          const o = await nuvemFetch(s.platform_store_id, s.platform_access_token, '/orders', {
            created_at_min: sd.toISOString(),
            created_at_max: ed.toISOString(),
            payment_status: 'paid',
            per_page: '200',
          })
          const tr = o.reduce(
            (a: number, x: { total: string }) => a + parseFloat(x.total ?? '0'),
            0
          )
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  period: period ?? 'today',
                  order_count: o.length,
                  total_revenue: `R$ ${tr.toFixed(2)}`,
                  average_ticket: `R$ ${(o.length > 0 ? tr / o.length : 0).toFixed(2)}`,
                }),
              },
            ],
          }
        } catch (e) {
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ error: (e as Error).message }) },
            ],
            isError: true,
          }
        }
      }
    )

    server.registerTool(
      'STORE_QUERY_STOCK',
      {
        description: 'Query product stock levels.',
        inputSchema: z.object({
          search: z.string().optional(),
          low_stock_only: z.boolean().optional(),
          limit: z.number().optional(),
        }),
      },
      async ({ search, low_stock_only, limit }) => {
        const s = await getStore()
        if (!s?.platform_store_id || !s?.platform_access_token)
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ error: 'Store not connected' }) },
            ],
            isError: true,
          }
        try {
          const p = await nuvemFetch(s.platform_store_id, s.platform_access_token, '/products', {
            per_page: String(limit ?? 20),
          })
          let m = p.map((x: any) => ({
            id: x.id,
            name: x.name?.pt ?? x.name?.es ?? 'Sem nome',
            stock: x.variants?.reduce((a: number, v: any) => a + (v.stock ?? 0), 0) ?? 0,
            price: x.variants?.[0]?.price ?? null,
          }))
          if (search) m = m.filter((x: any) => x.name.toLowerCase().includes(search.toLowerCase()))
          if (low_stock_only) m = m.filter((x: any) => x.stock <= 5)
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ products: m, total: m.length }) },
            ],
          }
        } catch (e) {
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ error: (e as Error).message }) },
            ],
            isError: true,
          }
        }
      }
    )

    server.registerTool(
      'STORE_LIST_ORDERS',
      {
        description: 'List recent orders.',
        inputSchema: z.object({
          status: z.enum(['open', 'closed', 'cancelled']).optional(),
          limit: z.number().optional(),
        }),
      },
      async ({ status, limit }) => {
        const s = await getStore()
        if (!s?.platform_store_id || !s?.platform_access_token)
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ error: 'Store not connected' }) },
            ],
            isError: true,
          }
        try {
          const pr: Record<string, string> = { per_page: String(limit ?? 10) }
          if (status) pr.status = status
          const o = await nuvemFetch(s.platform_store_id, s.platform_access_token, '/orders', pr)
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  orders: o.map((x: any) => ({
                    number: x.number ?? x.id,
                    status: x.status,
                    total: `R$ ${parseFloat(x.total ?? '0').toFixed(2)}`,
                    customer: x.customer?.name ?? 'Anônimo',
                    date: x.created_at,
                  })),
                  count: o.length,
                }),
              },
            ],
          }
        } catch (e) {
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ error: (e as Error).message }) },
            ],
            isError: true,
          }
        }
      }
    )

    server.registerTool(
      'STORE_GET_STORE_INFO',
      {
        description: 'Get store information.',
        inputSchema: z.object({}),
      },
      async () => {
        const { data } = await supabase
          .from('stores')
          .select('id, name, segment, platform')
          .eq('id', storeId)
          .single()
        return { content: [{ type: 'text' as const, text: JSON.stringify({ store: data }) }] }
      }
    )
  }

  // ── Handle request via MCP transport ──────────────────────────────

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)

  return transport.handleRequest(req)
})
