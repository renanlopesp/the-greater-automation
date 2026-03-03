'use client'

import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useCreateSupplier, useUpdateSupplier, type Supplier } from '@/lib/queries/suppliers'

interface FormData {
  name: string
  contact_email: string
  contact_phone: string
  lead_time_days: number
  min_order_value: number | undefined
  payment_terms: string
  notes: string
}

interface SupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  storeId: string
}

export default function SupplierDialog({ open, onOpenChange, supplier }: SupplierDialogProps) {
  const isEditing = !!supplier
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    values: open
      ? supplier
        ? {
            name: supplier.name,
            contact_email: supplier.contact_email ?? '',
            contact_phone: supplier.contact_phone ?? '',
            lead_time_days: supplier.lead_time_days,
            min_order_value: supplier.min_order_value ?? undefined,
            payment_terms: supplier.payment_terms ?? '',
            notes: supplier.notes ?? '',
          }
        : {
            name: '',
            contact_email: '',
            contact_phone: '',
            lead_time_days: 7,
            min_order_value: undefined,
            payment_terms: '',
            notes: '',
          }
      : undefined,
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (!data.name || data.name.length < 2) {
        toast.error('Nome deve ter pelo menos 2 caracteres')
        return
      }
      if (!data.lead_time_days || data.lead_time_days < 1 || data.lead_time_days > 365) {
        toast.error('Lead time deve ser entre 1 e 365 dias')
        return
      }

      const payload = {
        name: data.name,
        contact_email: data.contact_email || undefined,
        contact_phone: data.contact_phone || undefined,
        lead_time_days: data.lead_time_days,
        min_order_value: data.min_order_value || undefined,
        payment_terms: data.payment_terms || undefined,
        notes: data.notes || undefined,
      }

      if (isEditing) {
        await updateMutation.mutateAsync({ id: supplier.id, ...payload })
        toast.success('Fornecedor atualizado')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Fornecedor criado')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar fornecedor')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome do fornecedor"
              {...register('name', {
                required: 'Nome é obrigatório',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              })}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="contato@fornecedor.com"
                {...register('contact_email')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact_phone">Telefone</Label>
              <Input
                id="contact_phone"
                placeholder="(11) 99999-9999"
                {...register('contact_phone')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead_time_days">Lead Time (dias) *</Label>
              <Input
                id="lead_time_days"
                type="number"
                min={1}
                max={365}
                {...register('lead_time_days', {
                  required: 'Lead time é obrigatório',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Mínimo 1 dia' },
                  max: { value: 365, message: 'Máximo 365 dias' },
                })}
              />
              {errors.lead_time_days && (
                <p className="text-destructive text-xs">{errors.lead_time_days.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
              <Input
                id="min_order_value"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                {...register('min_order_value', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment_terms">Condições de Pagamento</Label>
            <Input
              id="payment_terms"
              placeholder="Ex: 30 dias, boleto"
              {...register('payment_terms')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o fornecedor..."
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
