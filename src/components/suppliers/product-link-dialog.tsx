'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useProductSupplierLinks,
  useCreateLink,
  useUpdateLink,
  useDeleteLink,
  type Supplier,
  type ProductSupplierLink,
} from '@/lib/queries/suppliers'

interface ProductLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  storeId: string
}

interface StoreProduct {
  id: string
  name: string
  price: number | null
  stock_quantity: number
  cost_price: number | null
}

export default function ProductLinkDialog({
  open,
  onOpenChange,
  supplier,
}: ProductLinkDialogProps) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null)
  const [costPrice, setCostPrice] = useState('')
  const [isPreferred, setIsPreferred] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { data: links, isLoading: linksLoading } = useProductSupplierLinks(
    open && supplier ? supplier.id : undefined
  )
  const createLink = useCreateLink()
  const updateLink = useUpdateLink()
  const deleteLink = useDeleteLink()

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setSearch('')
      setProducts([])
      setSelectedProduct(null)
      setCostPrice('')
      setIsPreferred(false)
    }
    onOpenChange(newOpen)
  }

  const searchProducts = async (q: string) => {
    if (q.length < 2) {
      setProducts([])
      return
    }
    setLoadingProducts(true)
    try {
      const res = await fetch(`/api/store/products?search=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleLink = async () => {
    if (!supplier || !selectedProduct) return
    setSubmitting(true)
    try {
      await createLink.mutateAsync({
        supplier_id: supplier.id,
        product_id: selectedProduct.id,
        cost_price: costPrice ? parseFloat(costPrice) : undefined,
        is_preferred: isPreferred,
      })
      toast.success(`${selectedProduct.name} vinculado a ${supplier.name}`)
      setSelectedProduct(null)
      setCostPrice('')
      setIsPreferred(false)
      setSearch('')
      setProducts([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao vincular produto')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePreferred = async (link: ProductSupplierLink) => {
    try {
      await updateLink.mutateAsync({
        id: link.id,
        is_preferred: !link.is_preferred,
      })
      toast.success(link.is_preferred ? 'Preferencial removido' : 'Marcado como preferencial')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const handleUnlink = async (link: ProductSupplierLink) => {
    try {
      await deleteLink.mutateAsync(link.id)
      toast.success('Produto desvinculado')
    } catch {
      toast.error('Erro ao desvincular')
    }
  }

  const linkedProductIds = new Set((links ?? []).map((l) => l.product_id))
  const availableProducts = products.filter((p) => !linkedProductIds.has(p.id))

  const formatCurrency = (value: number | null) => {
    if (value == null) return '—'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Produtos — {supplier?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Search and link new product */}
          <div className="flex flex-col gap-2">
            <Label>Vincular novo produto</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar produto por nome..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSelectedProduct(null)
                }}
                className="pl-9"
              />
            </div>

            {loadingProducts && <p className="text-muted-foreground text-xs">Buscando...</p>}

            {!selectedProduct && availableProducts.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {availableProducts.map((p) => (
                  <button
                    key={p.id}
                    className="hover:bg-muted flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                    onClick={() => {
                      setSelectedProduct(p)
                      setSearch(p.name)
                      setCostPrice(p.cost_price?.toString() ?? '')
                    }}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatCurrency(p.price)} · Estoque: {p.stock_quantity}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedProduct && (
              <div className="flex flex-col gap-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{selectedProduct.name}</span>
                  <Badge variant="secondary">{formatCurrency(selectedProduct.price)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="cost_price" className="text-xs">
                      Custo neste fornecedor (R$)
                    </Label>
                    <Input
                      id="cost_price"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0,00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <Switch
                      checked={isPreferred}
                      onCheckedChange={setIsPreferred}
                      id="is_preferred"
                    />
                    <Label htmlFor="is_preferred" className="text-xs">
                      Fornecedor preferencial
                    </Label>
                  </div>
                </div>
                <Button size="sm" onClick={handleLink} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Vincular
                </Button>
              </div>
            )}
          </div>

          {/* Existing links */}
          <div className="flex flex-col gap-2">
            <Label>Produtos vinculados ({links?.length ?? 0})</Label>
            {linksLoading ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Carregando...</p>
            ) : !links?.length ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Nenhum produto vinculado
              </p>
            ) : (
              <div className="max-h-60 divide-y overflow-y-auto rounded-md border">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {link.product?.name ?? 'Produto removido'}
                        </span>
                        {link.is_preferred && (
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        Custo: {formatCurrency(link.cost_price)}
                        {link.product?.price != null && link.cost_price != null && (
                          <>
                            {' '}
                            · Margem:{' '}
                            {((1 - link.cost_price / link.product.price) * 100).toFixed(0)}%
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleTogglePreferred(link)}
                        title={link.is_preferred ? 'Remover preferencial' : 'Marcar preferencial'}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${link.is_preferred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-7 w-7"
                        onClick={() => handleUnlink(link)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
