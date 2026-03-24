'use client'
import { useQuery } from '@tanstack/react-query'

export function useBrandDna() {
  const query = useQuery({
    queryKey: ['brand-dna'],
    queryFn: async () => {
      const res = await fetch('/api/store/brand-dna')
      if (!res.ok) return null
      return res.json()
    },
  })
  return {
    brandDna: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
