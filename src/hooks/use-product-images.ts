'use client'
import { useQuery } from '@tanstack/react-query'

interface ProductImage {
  name: string
  url: string
  label: string
  productName: string
}

export function useProductImages() {
  const query = useQuery({
    queryKey: ['product-images'],
    queryFn: async () => {
      const res = await fetch('/api/store/products/images')
      if (!res.ok) return { images: [] as ProductImage[], storeName: '' }
      return res.json() as Promise<{ images: ProductImage[]; storeName: string }>
    },
  })
  return {
    images: query.data?.images ?? [],
    storeName: query.data?.storeName ?? '',
    isLoading: query.isLoading,
  }
}
