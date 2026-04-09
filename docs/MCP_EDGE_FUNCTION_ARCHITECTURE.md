# MCP Server como Supabase Edge Function

**Data**: 2026-04-09
**Contexto**: Migração 058 — o MCP server precisa ser acessível publicamente pelo Managed Agent da Anthropic

## Por que Edge Function?

| Aspecto      | Next.js Route (atual)                                | Supabase Edge Function                                           |
| ------------ | ---------------------------------------------------- | ---------------------------------------------------------------- |
| URL pública  | Precisa de ngrok (dev) ou Vercel (prod)              | `https://<project>.supabase.co/functions/v1/mcp-tools` — estável |
| Deploy       | Junto com o Next.js (monolito)                       | Independente (`supabase functions deploy`)                       |
| Runtime      | Node.js (server-only restrictions)                   | Deno (sem restrições de import)                                  |
| Acesso ao DB | Via `createServiceRoleClient()` + imports complexos  | Direto via `createClient()` com service role key                 |
| Stateless    | Problemático — MCP precisa de session entre requests | Natural — Edge Functions são stateless por design                |
| Cold start   | ~2s (Next.js route)                                  | ~200ms (Deno isolate)                                            |
| Timeout      | 120s (Vercel)                                        | 150s (Supabase)                                                  |
| Custo        | Incluso no Vercel                                    | Incluso no Supabase (500K invocations/mês free)                  |

## Arquitetura Proposta

```
Anthropic Managed Agent
    ↓ MCP protocol (Streamable HTTP)
https://<project>.supabase.co/functions/v1/mcp-tools?team_id=X&user_id=Y&store_id=Z
    ↓
Supabase Edge Function (Deno)
    ├── MCP Server (initialize, tools/list, tools/call)
    ├── Tool handlers (SNEW_*, STORE_*)
    ├── Supabase client (service role, direct DB access)
    └── Nuvemshop client (HTTP calls for sales/stock/orders)
```

## Estrutura da Edge Function

```
supabase/functions/mcp-tools/
├── index.ts              # Entry point — MCP server + Streamable HTTP transport
├── tools/
│   ├── platform.ts       # SNEW_LIST_SKILLS, SNEW_RUN_SKILL, SNEW_MODIFY_ARTIFACT, etc.
│   ├── retail.ts         # STORE_QUERY_SALES, STORE_QUERY_STOCK, STORE_LIST_ORDERS, etc.
│   └── composio.ts       # SNEW_CHECK_CONNECTIONS, SNEW_LIST_AVAILABLE_APPS, etc.
├── lib/
│   ├── supabase.ts       # createClient with service role
│   └── nuvemshop.ts      # Nuvemshop API client (HTTP fetch, no SDK needed)
└── deno.json             # Deno config + import map
```

## Entry Point (`index.ts`)

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { registerPlatformTools } from './tools/platform.ts'
import { registerRetailTools } from './tools/retail.ts'
import { createSupabaseClient } from './lib/supabase.ts'

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const teamId = url.searchParams.get('team_id')
  const userId = url.searchParams.get('user_id')
  const storeId = url.searchParams.get('store_id')
  const taskId = url.searchParams.get('task_id')

  if (!teamId || !userId) {
    return new Response(JSON.stringify({ error: 'Missing context' }), { status: 400 })
  }

  const supabase = createSupabaseClient()
  const ctx = { teamId, userId, storeId, taskId, supabase }

  // Create MCP server per request (stateless)
  const server = new McpServer({ name: 'snew-tools', version: '1.0.0' })

  registerPlatformTools(server, ctx)
  if (storeId) registerRetailTools(server, ctx)

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  })
  await server.connect(transport)

  return transport.handleRequest(req)
})
```

## Stateless vs Stateful

O problema que tivemos no Next.js era que o MCP protocol faz 3+ requests sequenciais:

1. `initialize` — handshake
2. `tools/list` — listar tools disponíveis
3. `tools/call` — executar um tool

Com `sessionIdGenerator: undefined` (stateless), cada request cria um novo server. Isso funciona se o transport recria o state corretamente a cada request.

**Alternativa stateful**: Usar `sessionIdGenerator: () => crypto.randomUUID()` e manter sessions em memória. Edge Functions não compartilham memória entre invocações, então stateful só funciona se todas as requests de uma session vão para o mesmo isolate (não garantido).

**Solução recomendada**: Stateless. O `WebStandardStreamableHTTPServerTransport` no mode stateless re-inicializa o server a cada request. O `initialize` response já contém toda a info necessária. O `tools/list` recria a lista. O `tools/call` executa o tool diretamente. Não precisa de state entre requests.

## Vantagens sobre a abordagem atual

1. **Sem ngrok**: URL pública estável do Supabase
2. **Sem server-only**: Deno não tem essa restrição
3. **Sem conflito de porta**: Edge Function é serverless
4. **Deploy independente**: Atualizar tools sem redeploy do Next.js
5. **Acesso direto ao banco**: Sem overhead de RLS ou proxying
6. **Logs separados**: Supabase dashboard mostra logs da Edge Function
7. **Scaling automático**: Supabase gerencia os isolates

## Contexto via Query Params

A URL do MCP server no agent incluiria:

```
https://apsfeutbqvgfgznmaesg.supabase.co/functions/v1/mcp-tools?team_id=<TEAM_ID>&user_id=<USER_ID>&store_id=<STORE_ID>
```

Quando o agent é provisionado, a URL é construída com os IDs do team/user/store. O `task_id` pode ser adicionado dinamicamente via session metadata ou como header.

## Segurança

- A Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` (env var do Supabase, não exposta)
- Os query params (team_id, user_id) são validados contra o banco
- O endpoint só é chamado pela Anthropic (não exposto ao frontend)
- Opcionalmente: adicionar um secret token nos query params para validação extra

## Migração

1. Criar a Edge Function `supabase/functions/mcp-tools/`
2. Portar a lógica de tools de `platform-tools.ts` e `retail-tools.ts` para Deno
3. Adaptar o `NuvemshopClient` para usar `fetch` nativo (sem SDK)
4. Deployar: `supabase functions deploy mcp-tools`
5. Atualizar `MCP_SERVER_BASE_URL` para `https://apsfeutbqvgfgznmaesg.supabase.co/functions/v1`
6. Remover `/api/mcp/snew-tools/route.ts` do Next.js

## Tools a implementar na Edge Function

### Platform (sempre disponíveis)

- SNEW_LIST_SKILLS — query `skills` table
- SNEW_GET_SKILL — query `skills` + `skill_executions`
- SNEW_RUN_SKILL — execute skill logic (seasonal-calendar, copywriter)
- SNEW_ACTIVATE_SKILL — update `skills.status`
- SNEW_CHECK_CONNECTIONS — query Composio API
- SNEW_LIST_AVAILABLE_APPS — query Composio API
- SNEW_LIST_APP_CAPABILITIES — query Composio API
- SNEW_CREATE_NOTIFICATION — insert into `notifications`
- SNEW_MODIFY_ARTIFACT — update `tasks.artifact_data`
- SNEW_LIST_WORKFLOWS — query `agent_workflows`
- SNEW_RUN_WORKFLOW — insert into `agent_workflow_runs`

### Retail (quando store_id presente)

- STORE_QUERY_SALES — Nuvemshop API `/orders` com filtro de data
- STORE_QUERY_STOCK — Nuvemshop API `/products` com estoque
- STORE_LIST_ORDERS — Nuvemshop API `/orders`
- STORE_QUERY_CUSTOMERS — Nuvemshop API `/customers` + RFM analysis
- STORE_UPDATE_PRODUCT — Nuvemshop API PUT `/products/{id}`
- STORE_CREATE_PRODUCT — Nuvemshop API POST `/products`
- STORE_MANAGE_COUPONS — Nuvemshop API `/coupons`
- STORE_GET_STORE_INFO — query `stores` table
- STORE_QUERY_MARGINS — query `store_products.cost_price`
- (+ outros tools de retail)

## Complexidade da migração

| Aspecto                         | Esforço                                         |
| ------------------------------- | ----------------------------------------------- |
| Scaffold da Edge Function + MCP | Baixo (1-2h)                                    |
| Portar platform tools           | Médio (3-4h) — reescrever queries sem ORM       |
| Portar retail tools             | Alto (4-6h) — NuvemshopClient para fetch nativo |
| Portar Composio tools           | Médio (2-3h) — HTTP calls diretos               |
| Testes end-to-end               | Médio (2-3h)                                    |
| **Total estimado**              | **~15h**                                        |

A alternativa é manter no Next.js e resolver o problema de stateful MCP (mais rápido, ~3h, mas requer ngrok em dev e Vercel em prod).
