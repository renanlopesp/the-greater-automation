'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Truck, Calendar, TrendingDown, ArrowLeftRight, ShoppingCart } from 'lucide-react'
import type { ReorderItem } from '@/lib/queries/suppliers'

interface ReorderCardProps {
  item: ReorderItem
  onCompare?: (productId: string, productName: string) => void
  onRegisterPurchase?: (item: ReorderItem) => void
}

const urgencyConfig = {
  critical: {
    label: 'Crítico',
    border: 'border-red-500/30',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
    icon: 'text-red-500',
  },
  warning: {
    label: 'Atenção',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: 'text-amber-500',
  },
  healthy: {
    label: 'Saudável',
    border: 'border-green-500/30',
    badge: 'bg-green-500/10 text-green-600 dark:text-green-400',
    icon: 'text-green-500',
  },
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

export default function ReorderCard({ item, onCompare, onRegisterPurchase }: ReorderCardProps) {
  const config = urgencyConfig[item.urgency]

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-lg border p-4 transition-colors', config.border)}
    >
      {/* Header: product + urgency */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4 className="truncate text-sm font-medium">{item.product.name}</h4>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Truck className={cn('h-3 w-3 shrink-0', config.icon)} />
            <span className="truncate">{item.supplier.name}</span>
            <span>· {item.supplier.lead_time_days}d</span>
          </div>
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-xs', config.badge)}>
          {config.label}
        </Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Package className="h-3 w-3" />
            Estoque
          </span>
          <span className="text-sm font-medium">{item.product.stock_quantity} un</span>
          <span className="text-muted-foreground text-xs">{item.metrics.days_of_stock} dias</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <TrendingDown className="h-3 w-3" />
            Sugestão
          </span>
          <span className="text-sm font-medium">{item.metrics.suggested_qty} un</span>
          <span className="text-muted-foreground text-xs">
            {formatCurrency(item.metrics.suggested_value)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            Pedir até
          </span>
          <span className="text-sm font-medium">{formatDate(item.order_by_date)}</span>
          <span className="text-muted-foreground text-xs">{item.metrics.avg_daily_sales}/dia</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t pt-1">
        {item.has_other_suppliers && onCompare && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onCompare(item.product.id, item.product.name)}
          >
            <ArrowLeftRight className="mr-1 h-3 w-3" />
            Comparar
          </Button>
        )}
        {onRegisterPurchase && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onRegisterPurchase(item)}
          >
            <ShoppingCart className="mr-1 h-3 w-3" />
            Registrar Compra
          </Button>
        )}
      </div>
    </div>
  )
}
