import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SEGMENT_LABELS,
  PLATFORM_LABELS,
  type Segment,
  type Platform,
} from '@/lib/retail/segment-skills'

export default async function RetailHomePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's team
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  // Get store
  const { data: store } = await supabase
    .from('stores')
    .select(
      'id, name, segment, platform, platform_access_token, last_sync_at, priorities, created_at'
    )
    .eq('team_id', membership.team_id)
    .single()

  if (!store) redirect('/onboarding')

  // Get quick stats in parallel
  const [
    { count: productsCount },
    { count: lowStockCount },
    { data: recentOrders },
    { data: agents },
    { data: messagingLink },
  ] = await Promise.all([
    supabase
      .from('store_products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id),
    supabase
      .from('store_products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .lte('stock_quantity', 5),
    supabase
      .from('store_orders')
      .select('id, total, ordered_at')
      .eq('store_id', store.id)
      .order('ordered_at', { ascending: false })
      .limit(5),
    supabase
      .from('agents')
      .select('id, name, palette')
      .eq('team_id', membership.team_id)
      .order('created_at', { ascending: true }),
    supabase
      .from('messaging_links')
      .select('id, external_username, is_verified')
      .eq('user_id', user.id)
      .eq('channel_type', 'telegram')
      .single(),
  ])

  const isConnected = !!store.platform_access_token
  const hasTelegram = messagingLink?.is_verified ?? false
  const todayRevenue = (recentOrders ?? [])
    .filter((o) => {
      const orderDate = new Date(o.ordered_at)
      const today = new Date()
      return orderDate.toDateString() === today.toDateString()
    })
    .reduce((sum, o) => sum + Number(o.total), 0)

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
        <p className="text-muted-foreground">
          {SEGMENT_LABELS[store.segment as Segment]} · {PLATFORM_LABELS[store.platform as Platform]}
        </p>
      </div>

      {/* Telegram banner if not linked */}
      {!hasTelegram && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Conecte seu Telegram</p>
              <p className="text-muted-foreground text-sm">
                Receba alertas de estoque e vendas direto no celular.
              </p>
            </div>
            <a
              href="/messaging"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Conectar
            </a>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productsCount ?? 0}</div>
            {!isConnected && (
              <p className="text-muted-foreground text-xs">
                Conecte sua plataforma para sincronizar
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount ?? 0}</div>
            <p className="text-muted-foreground text-xs">produtos com 5 ou menos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Vendas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {todayRevenue.toFixed(2)}</div>
            <p className="text-muted-foreground text-xs">
              {(recentOrders ?? []).length} pedidos recentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Agentes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents?.length ?? 0}</div>
            <p className="text-muted-foreground text-xs">monitorando sua loja</p>
          </CardContent>
        </Card>
      </div>

      {/* Store Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status da Loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Plataforma</span>
            <span className="text-sm font-medium">
              {isConnected ? '✅ Conectada' : '⚠️ Não conectada'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Telegram</span>
            <span className="text-sm font-medium">
              {hasTelegram ? `✅ @${messagingLink?.external_username}` : '⚠️ Não conectado'}
            </span>
          </div>
          {store.last_sync_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Última sincronização</span>
              <span className="text-sm font-medium">
                {new Date(store.last_sync_at).toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seus Agentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {(agents ?? []).map((agent) => (
              <div key={agent.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={`h-8 w-8 rounded-full bg-${agent.palette}-500/20`} />
                <div>
                  <p className="text-sm font-medium">{agent.name}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
