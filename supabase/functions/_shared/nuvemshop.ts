const BASE = 'https://api.nuvemshop.com.br/v1'

interface NuvemProduct {
  id: number
  name: { pt?: string; es?: string } | string
  variants?: Array<{ price?: string; stock?: number }>
  description?: { pt?: string }
  categories?: unknown[]
  images?: Array<{ src: string }>
}

interface NuvemStore {
  id: number
  name: { pt?: string } | string
  email?: string
  segment?: string
  country?: string
}

async function nuvemFetch<T>(
  storeId: string,
  token: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE}/${storeId}${path}`)
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const userAgent = Deno.env.get('NUVEMSHOP_USER_AGENT') ?? 'Snew/1.0'
  const r = await fetch(url.toString(), {
    headers: { Authentication: `bearer ${token}`, 'User-Agent': userAgent },
  })
  if (!r.ok) throw new Error(`Nuvemshop ${r.status} ${r.statusText} — ${path}`)
  return (await r.json()) as T
}

export async function fetchStore(storeId: string, token: string): Promise<NuvemStore> {
  return nuvemFetch<NuvemStore>(storeId, token, '/store')
}

export async function fetchProducts(
  storeId: string,
  token: string,
  opts?: { limit?: number }
): Promise<NuvemProduct[]> {
  return nuvemFetch<NuvemProduct[]>(storeId, token, '/products', {
    per_page: String(opts?.limit ?? 200),
  })
}

export type { NuvemProduct, NuvemStore }
