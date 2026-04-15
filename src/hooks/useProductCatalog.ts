'use client'

import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studioSupabase } from '@/lib/supabase/studio-client'
import { STUDIO_PRODUCT_SEEDS } from '@/config/studioProducts'

export interface CatalogProduct {
  id: string
  product_id: string
  name: string
  sku: string
  image_url: string
}

const QUERY_KEY = ['studio', 'product-catalog'] as const

function mergeWithSeeds(products: CatalogProduct[]): CatalogProduct[] {
  const byId = new Map(products.map((product) => [product.product_id, product]))

  for (const seed of STUDIO_PRODUCT_SEEDS) {
    if (!byId.has(seed.product_id)) {
      byId.set(seed.product_id, {
        id: `seed-${seed.product_id}`,
        product_id: seed.product_id,
        name: seed.name,
        sku: seed.sku,
        image_url: '',
      })
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aSeedIndex = STUDIO_PRODUCT_SEEDS.findIndex((seed) => seed.product_id === a.product_id)
    const bSeedIndex = STUDIO_PRODUCT_SEEDS.findIndex((seed) => seed.product_id === b.product_id)
    if (aSeedIndex === -1 && bSeedIndex === -1) return a.name.localeCompare(b.name)
    if (aSeedIndex === -1) return 1
    if (bSeedIndex === -1) return -1
    return aSeedIndex - bSeedIndex
  })
}

async function fetchCatalog(): Promise<CatalogProduct[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = studioSupabase as any
  const { data } = await supabase
    .from('product_catalog')
    .select('*')
    .order('created_at', { ascending: true })

  return (data as CatalogProduct[] | null) ?? []
}

export function useProductCatalog() {
  const queryClient = useQueryClient()

  const { data: rawProducts = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCatalog,
    staleTime: 30_000,
  })

  const products = useMemo(() => mergeWithSeeds(rawProducts), [rawProducts])

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  }, [queryClient])

  const addMutation = useMutation({
    mutationFn: async ({ name, sku }: { name: string; sku: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = studioSupabase as any
      const product_id = `p${Date.now()}`
      const { data, error } = await supabase
        .from('product_catalog')
        .insert({ product_id, name, sku })
        .select()
        .single()
      if (error) throw error
      return data as CatalogProduct
    },
    onSuccess: invalidate,
  })

  const addProduct = useCallback(
    async (name: string, sku: string): Promise<CatalogProduct | null> => {
      try {
        return await addMutation.mutateAsync({ name, sku })
      } catch {
        return null
      }
    },
    [addMutation]
  )

  const removeMutation = useMutation({
    mutationFn: async (product_id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = studioSupabase as any
      const current = rawProducts.find((p) => p.product_id === product_id)
      if (current?.image_url) {
        await supabase.storage
          .from('product-images')
          .remove([
            `${product_id}.jpg`,
            `${product_id}.jpeg`,
            `${product_id}.png`,
            `${product_id}.webp`,
          ])
      }
      await supabase.from('product_catalog').delete().eq('product_id', product_id)
    },
    onSuccess: invalidate,
  })

  const removeProduct = useCallback(
    async (product_id: string) => {
      await removeMutation.mutateAsync(product_id)
    },
    [removeMutation]
  )

  const updateImageUrlMutation = useMutation({
    mutationFn: async ({ product_id, image_url }: { product_id: string; image_url: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = studioSupabase as any
      const seed = STUDIO_PRODUCT_SEEDS.find((s) => s.product_id === product_id)
      const existing = rawProducts.find((p) => p.product_id === product_id)

      if (!existing && seed) {
        const { error } = await supabase
          .from('product_catalog')
          .insert({ product_id, name: seed.name, sku: seed.sku, image_url })
        if (error) throw error
        return
      }

      await supabase.from('product_catalog').update({ image_url }).eq('product_id', product_id)
    },
    onSuccess: invalidate,
  })

  const updateImageUrl = useCallback(
    async (product_id: string, image_url: string) => {
      await updateImageUrlMutation.mutateAsync({ product_id, image_url })
    },
    [updateImageUrlMutation]
  )

  const uploadProductImage = useCallback(
    async (product_id: string, file: File): Promise<string | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = studioSupabase as any
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${product_id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true })

      if (uploadError) return null

      const {
        data: { publicUrl },
      } = supabase.storage.from('product-images').getPublicUrl(path)

      const cleanUrl = publicUrl.split('?')[0]
      const urlWithBuster = `${cleanUrl}?t=${Date.now()}`

      await updateImageUrl(product_id, cleanUrl)
      return urlWithBuster
    },
    [updateImageUrl]
  )

  const removeImageMutation = useMutation({
    mutationFn: async (product_id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = studioSupabase as any
      await supabase.storage
        .from('product-images')
        .remove([
          `${product_id}.jpg`,
          `${product_id}.jpeg`,
          `${product_id}.png`,
          `${product_id}.webp`,
        ])

      const existing = rawProducts.find((p) => p.product_id === product_id)
      if (!existing) return

      await supabase.from('product_catalog').update({ image_url: '' }).eq('product_id', product_id)
    },
    onSuccess: invalidate,
  })

  const removeProductImage = useCallback(
    async (product_id: string) => {
      await removeImageMutation.mutateAsync(product_id)
    },
    [removeImageMutation]
  )

  return {
    products,
    loading,
    addProduct,
    removeProduct,
    updateImageUrl,
    uploadProductImage,
    removeProductImage,
    refetch: invalidate,
  }
}
