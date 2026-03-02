'use client'

import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Star, Trophy, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ProductSupplierLink } from '@/lib/queries/suppliers'

interface SupplierCompareProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string | null
  productName: string | null
}

export default function SupplierCompare({
  open,
  onOpenChange,
  productId,
  productName,
}: SupplierCompareProps) {
  const { data: links = [], isLoading: loading } = useQuery({
    queryKey: ['product-supplier-links', 'compare', productId],
    queryFn: async (): Promise<ProductSupplierLink[]> => {
      const res = await fetch(`/api/store/suppliers/products?product_id=${productId}`)
      if (!res.ok) return []
      const data = await res.json()
      return data.links ?? []
    },
    enabled: open && !!productId,
    staleTime: 30_000,
  })

  const bestPrice =
    links.length > 0
      ? Math.min(...links.filter((l) => l.cost_price != null).map((l) => l.cost_price!))
      : null
  const fastestLead =
    links.length > 0
      ? Math.min(
          ...links
            .filter((l) => l.supplier?.lead_time_days != null)
            .map((l) => l.supplier!.lead_time_days)
        )
      : null

  const formatCurrency = (value: number | null) => {
    if (value == null) return '—'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Comparar Fornecedores — {productName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            <p className="text-sm">Nenhum fornecedor vinculado a este produto.</p>
          </div>
        ) : links.length === 1 ? (
          <div className="text-muted-foreground py-8 text-center">
            <p className="text-sm">Apenas 1 fornecedor vinculado.</p>
            <p className="mt-1 text-xs">
              Vincule mais fornecedores para comparar preços e lead times.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Pedido Mín.</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => {
                  const isBestPrice = link.cost_price != null && link.cost_price === bestPrice
                  const isFastest =
                    link.supplier?.lead_time_days != null &&
                    link.supplier.lead_time_days === fastestLead
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {link.supplier?.name ?? 'Desconhecido'}
                          </span>
                          {link.is_preferred && (
                            <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              isBestPrice && 'font-semibold text-green-600 dark:text-green-400'
                            )}
                          >
                            {formatCurrency(link.cost_price)}
                          </span>
                          {isBestPrice && links.length > 1 && (
                            <Trophy className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              isFastest && 'font-semibold text-blue-600 dark:text-blue-400'
                            )}
                          >
                            {link.supplier?.lead_time_days ?? '—'} dias
                          </span>
                          {isFastest && links.length > 1 && (
                            <Zap className="h-3.5 w-3.5 text-blue-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(link.supplier?.min_order_value ?? null)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{formatDate(link.last_order_at)}</span>
                          {link.last_order_qty && (
                            <span className="text-muted-foreground text-xs">
                              {link.last_order_qty} un
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {link.is_preferred && (
                            <Badge variant="default" className="text-xs">
                              Pref.
                            </Badge>
                          )}
                          {isBestPrice && (
                            <Badge
                              variant="outline"
                              className="border-green-500/30 text-xs text-green-600"
                            >
                              Menor
                            </Badge>
                          )}
                          {isFastest && (
                            <Badge
                              variant="outline"
                              className="border-blue-500/30 text-xs text-blue-600"
                            >
                              Rápido
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
