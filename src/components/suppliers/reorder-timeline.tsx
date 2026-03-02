'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, Package } from 'lucide-react'
import { useReorderTimeline, type ReorderItem } from '@/lib/queries/suppliers'
import ReorderCard from './reorder-card'
import SupplierCompare from './supplier-compare'
import PurchaseHistory from './purchase-history'

interface ReorderTimelineProps {
  storeId: string
}

type UrgencyFilter = 'all' | 'critical' | 'warning' | 'healthy'

export default function ReorderTimeline({ storeId: _storeId }: ReorderTimelineProps) {
  const [filter, setFilter] = useState<UrgencyFilter>('all')
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareProductId, setCompareProductId] = useState<string | null>(null)
  const [compareProductName, setCompareProductName] = useState<string | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [purchaseItem, setPurchaseItem] = useState<ReorderItem | null>(null)

  const handleCompare = (productId: string, productName: string) => {
    setCompareProductId(productId)
    setCompareProductName(productName)
    setCompareOpen(true)
  }

  const handleRegisterPurchase = (item: ReorderItem) => {
    setPurchaseItem(item)
    setPurchaseOpen(true)
  }

  const { data, isLoading } = useReorderTimeline(filter !== 'all' ? { urgency: filter } : undefined)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted/50 h-32 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data?.items?.length && !data?.no_supplier?.length) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p className="text-sm">Nenhum produto com fornecedor vinculado para calcular reposição.</p>
        <p className="mt-1 text-xs">Vincule produtos a fornecedores na aba Fornecedores.</p>
      </div>
    )
  }

  const summary = data.summary

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Críticos"
          count={summary.critical}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          className="border-red-500/20"
          active={filter === 'critical'}
          onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}
        />
        <SummaryCard
          label="Atenção"
          count={summary.warning}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          className="border-amber-500/20"
          active={filter === 'warning'}
          onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
        />
        <SummaryCard
          label="Saudáveis"
          count={summary.healthy}
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          className="border-green-500/20"
          active={filter === 'healthy'}
          onClick={() => setFilter(filter === 'healthy' ? 'all' : 'healthy')}
        />
        <SummaryCard
          label="Sem fornecedor"
          count={summary.no_supplier}
          icon={<Package className="text-muted-foreground h-4 w-4" />}
          className="border-muted"
        />
      </div>

      {/* Filter indicator */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Filtrando:{' '}
            <span className="text-foreground font-medium capitalize">
              {filter === 'critical' ? 'Críticos' : filter === 'warning' ? 'Atenção' : 'Saudáveis'}
            </span>
          </span>
          <button
            className="text-muted-foreground hover:text-foreground text-xs underline"
            onClick={() => setFilter('all')}
          >
            Limpar filtro
          </button>
        </div>
      )}

      {/* All healthy message */}
      {summary.critical === 0 && summary.warning === 0 && filter === 'all' && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="text-sm font-medium">Todos os produtos estão com estoque saudável</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {summary.total_products} produtos monitorados, nenhuma reposição urgente.
            </p>
          </div>
        </div>
      )}

      {/* Reorder cards */}
      {data.items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.items.map((item) => (
            <ReorderCard
              key={`${item.product.id}-${item.supplier.id}`}
              item={item}
              onCompare={handleCompare}
              onRegisterPurchase={handleRegisterPurchase}
            />
          ))}
        </div>
      )}

      {/* Compare & Purchase dialogs */}
      <SupplierCompare
        open={compareOpen}
        onOpenChange={setCompareOpen}
        productId={compareProductId}
        productName={compareProductName}
      />
      <PurchaseHistory
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        item={purchaseItem}
        linkId={purchaseItem?.link_id}
      />

      {/* No supplier section */}
      {data.no_supplier.length > 0 && filter === 'all' && (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Produtos sem fornecedor ({data.no_supplier.length})
          </h3>
          <div className="divide-y rounded-md border">
            {data.no_supplier.map((p) => (
              <div
                key={p.product_id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>{p.product_name}</span>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                  <span>Estoque: {p.stock_quantity}</span>
                  {p.days_of_stock < 999 && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        p.days_of_stock < 15 ? 'border-amber-500/30 text-amber-600' : ''
                      )}
                    >
                      ~{p.days_of_stock}d
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  count,
  icon,
  className,
  active,
  onClick,
}: {
  label: string
  count: number
  icon: React.ReactNode
  className?: string
  active?: boolean
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
        className,
        onClick && 'hover:bg-muted/50 cursor-pointer',
        active && 'ring-primary/50 ring-2'
      )}
      onClick={onClick}
    >
      {icon}
      <div className="flex flex-col">
        <span className="text-lg leading-none font-semibold">{count}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
    </Comp>
  )
}
