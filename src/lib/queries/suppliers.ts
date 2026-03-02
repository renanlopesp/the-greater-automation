'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ── Types ──────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  lead_time_days: number
  min_order_value: number | null
  payment_terms: string | null
  notes: string | null
  is_active: boolean
  product_count?: number
  created_at: string
  updated_at: string
}

export interface ProductSupplierLink {
  id: string
  supplier_id: string
  product_id: string
  cost_price: number | null
  is_preferred: boolean
  last_order_at: string | null
  last_order_qty: number | null
  created_at: string
  updated_at: string
  supplier?: { id: string; name: string; lead_time_days: number; min_order_value: number | null }
  product?: { id: string; name: string; price: number | null; stock_quantity: number }
}

export interface ReorderItem {
  product: {
    id: string
    name: string
    stock_quantity: number
    price: number | null
  }
  supplier: {
    id: string
    name: string
    lead_time_days: number
    min_order_value: number | null
  }
  metrics: {
    avg_daily_sales: number
    days_of_stock: number
    reorder_point: number
    suggested_qty: number
    suggested_value: number
  }
  link_id: string
  cost_price: number | null
  urgency: 'critical' | 'warning' | 'healthy'
  order_by_date: string
  has_other_suppliers: boolean
}

export interface ReorderSummary {
  total_products: number
  critical: number
  warning: number
  healthy: number
  no_supplier: number
}

export interface ReorderData {
  summary: ReorderSummary
  items: ReorderItem[]
  no_supplier: {
    product_id: string
    product_name: string
    stock_quantity: number
    avg_daily_sales: number
    days_of_stock: number
  }[]
}

// ── Supplier Hooks ─────────────────────────────────────────────────────────

export function useSuppliers(params?: {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  sort?: 'name' | 'lead_time' | 'created'
  order?: 'asc' | 'desc'
}) {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.sort) searchParams.set('sort', params.sort)
  if (params?.order) searchParams.set('order', params.order)
  const qs = searchParams.toString()

  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: async (): Promise<Supplier[]> => {
      const res = await fetch(`/api/store/suppliers${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      const data = await res.json()
      return data.suppliers
    },
    staleTime: 30_000,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      contact_email?: string
      contact_phone?: string
      lead_time_days: number
      min_order_value?: number
      payment_terms?: string
      notes?: string
    }) => {
      const res = await fetch('/api/store/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create supplier')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      name?: string
      contact_email?: string | null
      contact_phone?: string | null
      lead_time_days?: number
      min_order_value?: number | null
      payment_terms?: string | null
      notes?: string | null
    }) => {
      const res = await fetch(`/api/store/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update supplier')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useDeactivateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/store/suppliers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to deactivate supplier')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

// ── Product-Supplier Link Hooks ────────────────────────────────────────────

export function useProductSupplierLinks(supplierId?: string) {
  return useQuery({
    queryKey: ['product-supplier-links', supplierId],
    queryFn: async (): Promise<ProductSupplierLink[]> => {
      const params = supplierId ? `?supplier_id=${supplierId}` : ''
      const res = await fetch(`/api/store/suppliers/products${params}`)
      if (!res.ok) throw new Error('Failed to fetch links')
      const data = await res.json()
      return data.links
    },
    enabled: !!supplierId,
    staleTime: 30_000,
  })
}

export function useCreateLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      supplier_id: string
      product_id: string
      cost_price?: number
      is_preferred?: boolean
    }) => {
      const res = await fetch('/api/store/suppliers/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create link')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-supplier-links'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['reorder-timeline'] })
    },
  })
}

export function useUpdateLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      id: string
      cost_price?: number | null
      is_preferred?: boolean
      last_order_at?: string
      last_order_qty?: number
    }) => {
      const res = await fetch('/api/store/suppliers/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update link')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-supplier-links'] })
      queryClient.invalidateQueries({ queryKey: ['reorder-timeline'] })
    },
  })
}

export function useDeleteLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/store/suppliers/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete link')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-supplier-links'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['reorder-timeline'] })
    },
  })
}

// ── Reorder Timeline Hook ──────────────────────────────────────────────────

export function useReorderTimeline(params?: {
  urgency?: 'critical' | 'warning' | 'healthy' | 'all'
  supplier_id?: string
  days?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.urgency) searchParams.set('urgency', params.urgency)
  if (params?.supplier_id) searchParams.set('supplier_id', params.supplier_id)
  if (params?.days) searchParams.set('days', String(params.days))
  const qs = searchParams.toString()

  return useQuery({
    queryKey: ['reorder-timeline', params],
    queryFn: async (): Promise<ReorderData> => {
      const res = await fetch(`/api/store/suppliers/reorder${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch reorder timeline')
      return res.json()
    },
    staleTime: 60_000,
  })
}
