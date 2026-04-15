'use client'

import { X } from 'lucide-react'
import type { NormalizedProduct } from '@/lib/studio/product-normalizer'

interface ActiveProductChipProps {
  product: NormalizedProduct | null
  onRemove: () => void
}

export function ActiveProductChip({ product, onRemove }: ActiveProductChipProps) {
  if (!product) return null

  const displayName = product.name.length > 20 ? `${product.name.slice(0, 20)}…` : product.name

  return (
    <div className="border-border bg-accent/40 inline-flex items-center gap-2 rounded-full border py-1 pr-2 pl-1 text-xs">
      <div className="bg-muted h-5 w-5 flex-shrink-0 overflow-hidden rounded-full">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <span className="text-foreground max-w-[140px] truncate font-medium">{displayName}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover produto ${product.name}`}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
