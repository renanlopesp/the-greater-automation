'use client'

import { useState } from 'react'
import { Search, Plus, Pencil, Ban, ArrowUpDown, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSuppliers, useDeactivateSupplier, type Supplier } from '@/lib/queries/suppliers'
import SupplierDialog from './supplier-dialog'
import ProductLinkDialog from './product-link-dialog'

interface SupplierListProps {
  storeId: string
}

export default function SupplierList({ storeId }: SupplierListProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active')
  const [sort, setSort] = useState<'name' | 'lead_time' | 'created'>('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkingSupplier, setLinkingSupplier] = useState<Supplier | null>(null)

  const { data: suppliers, isLoading } = useSuppliers({ search, status, sort, order })
  const deactivate = useDeactivateSupplier()

  const handleSort = (col: 'name' | 'lead_time' | 'created') => {
    if (sort === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(col)
      setOrder('asc')
    }
  }

  const handleDeactivate = async (supplier: Supplier) => {
    try {
      await deactivate.mutateAsync(supplier.id)
      toast.success(`${supplier.name} desativado`)
    } catch {
      toast.error('Erro ao desativar fornecedor')
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingSupplier(null)
    setDialogOpen(true)
  }

  const handleLinkProducts = (supplier: Supplier) => {
    setLinkingSupplier(supplier)
    setLinkDialogOpen(true)
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return '—'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center text-sm">Carregando...</div>
      ) : !suppliers?.length ? (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-sm">Nenhum fornecedor encontrado</p>
          <Button variant="outline" className="mt-4" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar primeiro fornecedor
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="hover:text-foreground flex items-center gap-1"
                    onClick={() => handleSort('name')}
                  >
                    Nome
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>
                  <button
                    className="hover:text-foreground flex items-center gap-1"
                    onClick={() => handleSort('lead_time')}
                  >
                    Lead Time
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Pedido Mínimo</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[130px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {supplier.contact_email || supplier.contact_phone || '—'}
                  </TableCell>
                  <TableCell>{supplier.lead_time_days} dias</TableCell>
                  <TableCell>{formatCurrency(supplier.min_order_value)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{supplier.product_count ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.is_active ? 'default' : 'outline'}>
                      {supplier.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleLinkProducts(supplier)}
                        title="Vincular produtos"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(supplier)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {supplier.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDeactivate(supplier)}
                          title="Desativar"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={editingSupplier}
        storeId={storeId}
      />

      <ProductLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        supplier={linkingSupplier}
        storeId={storeId}
      />
    </div>
  )
}
