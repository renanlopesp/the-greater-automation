import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { getStoreConnection, type StoreConnection } from '@/lib/studio/ecommerce-connection'
import { getComposio } from '@/lib/composio/client'
import {
  fromNuvemshop,
  fromShopifyComposio,
  type NormalizedProduct,
} from '@/lib/studio/product-normalizer'

/**
 * GET /api/studio/products — Returns a page of the team's real store products
 * in a backend-agnostic shape for the studio product picker. Enforces the
 * mutual-exclusion rule from spec 069 (Nuvemshop wins over Composio Shopify).
 *
 * Query params:
 *   - page (int, default 1)
 *   - per_page (int, default 50, max 100)
 *   - q (optional search string; ignored below 2 chars)
 *
 * Response: { kind, products, page, hasMore, warning?, error_code?, reauth_url? }
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ kind: null, products: [], page: 1, hasMore: false })
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const per_page = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('per_page') ?? '50') || 50)
  )
  const rawQ = (url.searchParams.get('q') ?? '').trim()
  const q = rawQ.length >= 2 ? rawQ : ''

  const conn = await getStoreConnection(teamId, user.id)

  if (conn.kind === null) {
    return NextResponse.json({ kind: null, products: [], page, hasMore: false })
  }

  if (conn.kind === 'nuvemshop') {
    return NextResponse.json(await listNuvemshopProducts(conn, page, per_page, q))
  }

  if (conn.kind === 'shopify-composio') {
    return NextResponse.json(await listShopifyComposioProducts(conn, user.id, page, per_page))
  }

  return NextResponse.json({ kind: null, products: [], page, hasMore: false })
}

interface ListResponse {
  kind: StoreConnection['kind']
  products: NormalizedProduct[]
  page: number
  hasMore: boolean
  warning?: 'store_api_unavailable'
  error_code?: 'NUVEMSHOP_AUTH_EXPIRED'
  reauth_url?: string
}

async function listNuvemshopProducts(
  conn: Extract<StoreConnection, { kind: 'nuvemshop' }>,
  page: number,
  per_page: number,
  q: string
): Promise<ListResponse> {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('per_page', String(per_page))
  if (q) qs.set('q', q)

  const url = `https://api.nuvemshop.com.br/v1/${conn.platformStoreId}/products?${qs.toString()}`

  try {
    const r = await fetch(url, {
      headers: {
        Authentication: `bearer ${conn.accessToken}`,
        'User-Agent': 'Snew/1.0',
      },
    })

    if (r.status === 401 || r.status === 403) {
      return {
        kind: 'nuvemshop',
        products: [],
        page,
        hasMore: false,
        error_code: 'NUVEMSHOP_AUTH_EXPIRED',
        reauth_url: '/api/nuvemshop/connect',
      }
    }

    const text = await r.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (!r.ok) {
      // Nuvemshop returns 404 with `{description: "Last page is 0"}` for empty
      // collections — treat as legitimate empty page.
      const desc =
        typeof data === 'object' && data !== null
          ? String((data as Record<string, unknown>).description ?? '')
          : ''
      if (r.status === 404 && /last page is 0|no records/i.test(desc)) {
        return { kind: 'nuvemshop', products: [], page, hasMore: false }
      }
      return {
        kind: 'nuvemshop',
        products: [],
        page,
        hasMore: false,
        warning: 'store_api_unavailable',
      }
    }

    const rawArr = Array.isArray(data) ? data : []
    const products = rawArr
      .map((raw) => fromNuvemshop(raw))
      .filter((p): p is NormalizedProduct => p !== null)

    // Nuvemshop exposes pagination via the `Link` header with rel="next".
    // Fall back to page-size inference when the header is missing.
    const linkHeader = r.headers.get('Link') ?? r.headers.get('link') ?? ''
    const hasMore = /rel="next"/i.test(linkHeader) || rawArr.length >= per_page

    return { kind: 'nuvemshop', products, page, hasMore }
  } catch {
    return {
      kind: 'nuvemshop',
      products: [],
      page,
      hasMore: false,
      warning: 'store_api_unavailable',
    }
  }
}

async function listShopifyComposioProducts(
  conn: Extract<StoreConnection, { kind: 'shopify-composio' }>,
  userId: string,
  page: number,
  per_page: number
): Promise<ListResponse> {
  try {
    const composio = getComposio()
    const slug = 'SHOPIFY_GET_PRODUCTS'

    const tools = await composio.tools.getRawComposioTools({
      toolkits: ['shopify'],
      limit: 300,
    })
    const toolMeta = tools.find((t) => t.slug === slug)

    // Composio's Shopify product-list is cursor-based. MVP approach: request
    // `per_page * page` products, then slice the current page client-side on
    // the server. Good enough up to ~1000-product catalogs; upgrade to true
    // cursor translation later if needed (research.md Decision 2).
    const requestLimit = Math.min(250, per_page * page)

    const result = (await composio.tools.execute(slug, {
      connectedAccountId: conn.connectedAccountId,
      userId,
      arguments: { limit: String(requestLimit) },
      ...(toolMeta?.version ? { version: toolMeta.version } : {}),
    })) as { successful?: boolean; data?: Record<string, unknown>; error?: string }

    if (!result.successful) {
      return {
        kind: 'shopify-composio',
        products: [],
        page,
        hasMore: false,
        warning: 'store_api_unavailable',
      }
    }

    const data = result.data ?? {}
    const rawProducts = (data.products ?? data.items ?? data.data ?? []) as Array<
      Record<string, unknown>
    >

    const offset = (page - 1) * per_page
    const slice = rawProducts.slice(offset, offset + per_page)

    const products = slice
      .map((raw) => fromShopifyComposio(raw))
      .filter((p): p is NormalizedProduct => p !== null)

    const hasMore = rawProducts.length > offset + per_page

    return { kind: 'shopify-composio', products, page, hasMore }
  } catch {
    return {
      kind: 'shopify-composio',
      products: [],
      page,
      hasMore: false,
      warning: 'store_api_unavailable',
    }
  }
}
