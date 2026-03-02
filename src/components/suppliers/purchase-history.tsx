'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useUpdateLink, type ReorderItem } from '@/lib/queries/suppliers'

interface PurchaseHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ReorderItem | null
  linkId?: string
}

export default function PurchaseHistory({
  open,
  onOpenChange,
  item,
  linkId,
}: PurchaseHistoryProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [quantity, setQuantity] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const updateLink = useUpdateLink()

  const handleOpen = () => {
    if (item) {
      setQuantity(String(item.metrics.suggested_qty))
      setTotalValue(item.metrics.suggested_value.toFixed(2))
    }
    setDate(new Date().toISOString().split('T')[0])
  }

  const handleSubmit = async () => {
    const resolvedLinkId = linkId || item?.link_id
    if (!resolvedLinkId) {
      toast.error('Vínculo não encontrado')
      return
    }

    const qty = parseInt(quantity)
    if (!qty || qty < 1) {
      toast.error('Quantidade deve ser pelo menos 1')
      return
    }

    setSubmitting(true)
    try {
      await updateLink.mutateAsync({
        id: resolvedLinkId,
        last_order_at: date,
        last_order_qty: qty,
      })
      toast.success('Compra registrada com sucesso')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar compra')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle>Registrar Compra</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">{item.product.name}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">Fornecedor: {item.supplier.name}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="purchase_date">Data da Compra</Label>
            <Input
              id="purchase_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="purchase_qty">Quantidade</Label>
              <Input
                id="purchase_qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="purchase_value">Valor Total (R$)</Label>
              <Input
                id="purchase_value"
                type="number"
                min={0}
                step="0.01"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
