'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { NormalizedProduct, ProductPickerWarningCode } from '@/lib/studio/product-normalizer'

interface PickerResponse {
  kind: 'nuvemshop' | 'shopify-composio' | null
  products: NormalizedProduct[]
  page: number
  hasMore: boolean
  warning?: ProductPickerWarningCode
  error_code?: 'NUVEMSHOP_AUTH_EXPIRED'
  reauth_url?: string
}

async function fetchStudioProducts(
  page: number,
  q: string,
  signal?: AbortSignal
): Promise<PickerResponse> {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('per_page', '50')
  if (q) qs.set('q', q)
  const res = await fetch(`/api/studio/products?${qs.toString()}`, {
    credentials: 'include',
    signal,
  })
  if (!res.ok) throw new Error(`studio-products ${res.status}`)
  return (await res.json()) as PickerResponse
}

interface StudioProductPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (product: NormalizedProduct) => void
  activeProductId?: string | null
}

export function StudioProductPicker({
  open,
  onOpenChange,
  onPick,
  activeProductId,
}: StudioProductPickerProps) {
  const [q, setQ] = useState('')

  const query = useQuery({
    queryKey: ['studio-products', 1, q.trim().length >= 2 ? q.trim() : ''],
    queryFn: ({ signal }) => fetchStudioProducts(1, q.trim().length >= 2 ? q.trim() : '', signal),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })

  const data = query.data
  const products = data?.products ?? []
  const kind = data?.kind ?? null
  const warning = data?.warning
  const errorCode = data?.error_code

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Escolha um produto</SheetTitle>
        </SheetHeader>

        <div className="border-b p-3">
          <Input
            placeholder="Buscar produto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {query.isLoading && <LoadingGrid />}

          {!query.isLoading && errorCode === 'NUVEMSHOP_AUTH_EXPIRED' && (
            <EmptyState
              title="Autorização Nuvemshop expirou"
              description="Reconecte sua loja para listar os produtos."
              cta={{ label: 'Reautorizar', href: data?.reauth_url ?? '/apps' }}
            />
          )}

          {!query.isLoading && !errorCode && kind === null && (
            <EmptyState
              title="Nenhuma loja conectada"
              description="Conecte Nuvemshop ou Shopify em Apps para ver seus produtos."
              cta={{ label: 'Conectar loja', href: '/apps' }}
            />
          )}

          {!query.isLoading &&
            !errorCode &&
            kind !== null &&
            warning === 'store_api_unavailable' && (
              <EmptyState
                title="Loja temporariamente indisponível"
                description="Não conseguimos carregar os produtos agora."
                cta={{ label: 'Tentar novamente', onClick: () => query.refetch() }}
              />
            )}

          {!query.isLoading && !errorCode && kind !== null && !warning && products.length === 0 && (
            <EmptyState
              title={q ? 'Nenhum produto encontrado' : 'Sua loja não tem produtos publicados'}
              description={
                q
                  ? `Nenhum produto com "${q}".`
                  : 'Publique um produto no admin da sua loja para vê-lo aqui.'
              }
              cta={q ? { label: 'Limpar busca', onClick: () => setQ('') } : undefined}
            />
          )}

          {products.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isActive={p.id === activeProductId}
                  onClick={() => {
                    onPick(p)
                    onOpenChange(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface ProductCardProps {
  product: NormalizedProduct
  isActive: boolean
  onClick: () => void
}

function ProductCard({ product, isActive, onClick }: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 overflow-hidden rounded-lg border text-left transition-colors ${
        isActive ? 'border-foreground bg-accent' : 'border-border bg-background hover:bg-accent/40'
      }`}
    >
      <div className="bg-muted aspect-square w-full overflow-hidden">
        {product.image ? (
          // Product thumbnails are remote + often hotlinked from the store
          // CDN. Next/Image adds complexity for marginal benefit inside a
          // transient picker sheet — plain <img> is acceptable here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
            sem imagem
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <div className="truncate text-xs font-medium">{product.name}</div>
        {product.price && <div className="text-muted-foreground text-[10px]">{product.price}</div>}
      </div>
    </button>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-border overflow-hidden rounded-lg border">
          <div className="bg-muted aspect-square w-full animate-pulse" />
          <div className="px-2 py-1.5">
            <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  cta?: { label: string; href?: string; onClick?: () => void }
}

function EmptyState({ title, description, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-muted-foreground max-w-xs text-xs">{description}</div>
      {cta &&
        (cta.href ? (
          <Button asChild size="sm" variant="outline">
            <a href={cta.href}>{cta.label}</a>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={cta.onClick}>
            {cta.label}
          </Button>
        ))}
    </div>
  )
}
