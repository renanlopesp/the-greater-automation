'use client'

import { Package, ShoppingCart, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SalesSummaryData {
  total_revenue: number
  order_count: number
  paid_count?: number
  period: string
  top_products?: Array<{ name: string; quantity: number; revenue: number }>
}

interface ProductTableData {
  products: Array<{ name: string; stock: number; price: number; status?: string }>
  total_count: number
}

interface OrderListData {
  orders: Array<{
    number: string
    customer: string
    total: number
    status: string
    date: string
  }>
  total_revenue?: number
  total_count: number
}

interface MetricCardData {
  value: string
  label: string
  subtitle?: string
}

interface ChatDataPayload {
  type: 'sales_summary' | 'product_table' | 'order_list' | 'metric_card'
  title: string
  data: SalesSummaryData | ProductTableData | OrderListData | MetricCardData
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ChatDataArtifact({ data }: { data: unknown }) {
  const payload = data as ChatDataPayload
  if (!payload?.type || !payload?.data) return <FallbackCard data={data} />

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-6 py-4"
        style={{ borderColor: 'color-mix(in srgb, var(--foreground) 8%, transparent)' }}
      >
        <ArtifactIcon type={payload.type} />
        <h2 className="text-foreground text-[15px] font-semibold">{payload.title}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {payload.type === 'sales_summary' && (
          <SalesSummaryCard data={payload.data as SalesSummaryData} />
        )}
        {payload.type === 'product_table' && (
          <ProductTableCard data={payload.data as ProductTableData} />
        )}
        {payload.type === 'order_list' && <OrderListCard data={payload.data as OrderListData} />}
        {payload.type === 'metric_card' && <MetricCardCard data={payload.data as MetricCardData} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Artifact Icon
// ---------------------------------------------------------------------------

function ArtifactIcon({ type }: { type: string }) {
  const iconClass = 'h-4 w-4'
  const style = { color: 'var(--muted-foreground)' }
  switch (type) {
    case 'sales_summary':
      return <TrendingUp className={iconClass} style={style} />
    case 'product_table':
      return <Package className={iconClass} style={style} />
    case 'order_list':
      return <ShoppingCart className={iconClass} style={style} />
    case 'metric_card':
      return <BarChart3 className={iconClass} style={style} />
    default:
      return <BarChart3 className={iconClass} style={style} />
  }
}

// ---------------------------------------------------------------------------
// Sales Summary
// ---------------------------------------------------------------------------

function SalesSummaryCard({ data }: { data: SalesSummaryData }) {
  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div className="flex flex-col gap-5">
      {/* Revenue highlight */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}
      >
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Receita {data.period}
        </p>
        <p className="text-foreground mt-1 text-3xl font-bold tracking-tight">
          {formatCurrency(data.total_revenue)}
        </p>
        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
          <span>
            <strong className="text-foreground">{data.order_count}</strong>{' '}
            {data.order_count === 1 ? 'pedido' : 'pedidos'}
          </span>
          {data.paid_count != null && (
            <span>
              <strong className="text-foreground">{data.paid_count}</strong> pagos
            </span>
          )}
        </div>
      </div>

      {/* Top products */}
      {data.top_products && data.top_products.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
            Top Produtos
          </p>
          <div className="flex flex-col gap-2">
            {data.top_products.map((product, i) => {
              const maxRevenue = Math.max(...data.top_products!.map((p) => p.revenue))
              const barWidth = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0
              return (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: 'color-mix(in srgb, var(--foreground) 6%, transparent)',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-foreground truncate text-[13px] font-medium">
                        {product.name}
                      </p>
                      <p className="text-foreground shrink-0 text-[13px] font-semibold">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                    <div
                      className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--foreground) 6%, transparent)',
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barWidth}%`,
                          background: 'color-mix(in srgb, var(--foreground) 20%, transparent)',
                        }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      {product.quantity} {product.quantity === 1 ? 'un' : 'un'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!data.top_products || data.top_products.length === 0) && data.order_count === 0 && (
        <p className="text-muted-foreground text-center text-sm">
          Nenhuma venda encontrada para {data.period}.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product Table
// ---------------------------------------------------------------------------

function ProductTableCard({ data }: { data: ProductTableData }) {
  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        {data.total_count} {data.total_count === 1 ? 'produto' : 'produtos'}
      </p>
      <div className="flex flex-col gap-1">
        {data.products.map((product, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{
              background:
                i % 2 === 0
                  ? 'color-mix(in srgb, var(--foreground) 3%, transparent)'
                  : 'transparent',
            }}
          >
            <div className="flex items-center gap-3">
              {product.status === 'critical' || product.stock === 0 ? (
                <AlertTriangle size={14} className="shrink-0 text-red-500" />
              ) : product.status === 'warning' || product.stock <= 5 ? (
                <AlertTriangle size={14} className="shrink-0 text-amber-500" />
              ) : (
                <Package size={14} className="text-muted-foreground shrink-0" />
              )}
              <p className="text-foreground text-[13px] font-medium">{product.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`text-[13px] font-semibold ${product.stock === 0 ? 'text-red-500' : product.stock <= 5 ? 'text-amber-500' : 'text-foreground'}`}
              >
                {product.stock} un
              </span>
              <span className="text-muted-foreground text-[13px]">
                {formatCurrency(product.price)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {data.products.length === 0 && (
        <p className="text-muted-foreground text-center text-sm">Nenhum produto encontrado.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Order List
// ---------------------------------------------------------------------------

function OrderListCard({ data }: { data: OrderListData }) {
  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const statusMap: Record<string, { label: string; color: string }> = {
    paid: { label: 'Pago', color: 'var(--green, oklch(0.6 0.15 150))' },
    pending: { label: 'Pendente', color: 'var(--amber, oklch(0.7 0.15 80))' },
    cancelled: { label: 'Cancelado', color: 'var(--destructive)' },
    refunded: { label: 'Reembolsado', color: 'var(--muted-foreground)' },
  }

  return (
    <div className="flex flex-col gap-3">
      {data.total_revenue != null && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            {data.total_count} {data.total_count === 1 ? 'pedido' : 'pedidos'}
          </p>
          <p className="text-foreground text-sm font-semibold">
            {formatCurrency(data.total_revenue)}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {data.orders.map((order, i) => {
          const statusInfo = statusMap[order.status] ?? {
            label: order.status,
            color: 'var(--muted-foreground)',
          }
          return (
            <div
              key={i}
              className="rounded-xl border p-3"
              style={{ borderColor: 'color-mix(in srgb, var(--foreground) 6%, transparent)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-[13px] font-semibold">{order.number}</span>
                  <span className="text-muted-foreground text-[12px]">{order.customer}</span>
                </div>
                <span className="text-foreground text-[13px] font-semibold">
                  {formatCurrency(order.total)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span
                  className="flex items-center gap-1 text-[11px] font-medium"
                  style={{ color: statusInfo.color }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: statusInfo.color }}
                  />
                  {statusInfo.label}
                </span>
                <span className="text-muted-foreground text-[11px]">{order.date}</span>
              </div>
            </div>
          )
        })}
      </div>
      {data.orders.length === 0 && (
        <p className="text-muted-foreground text-center text-sm">Nenhum pedido encontrado.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCardCard({ data }: { data: MetricCardData }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        className="rounded-2xl px-10 py-8 text-center"
        style={{ background: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}
      >
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {data.label}
        </p>
        <p className="text-foreground mt-2 text-4xl font-bold tracking-tight">{data.value}</p>
        {data.subtitle && <p className="text-muted-foreground mt-2 text-[13px]">{data.subtitle}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

function FallbackCard({ data }: { data: unknown }) {
  return (
    <div className="p-6">
      <pre className="text-foreground overflow-x-auto text-xs" style={{ whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
