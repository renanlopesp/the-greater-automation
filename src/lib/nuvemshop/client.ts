import {
  NuvemshopProductSchema,
  NuvemshopOrderSchema,
  NuvemshopTokenResponseSchema,
  NuvemshopWebhookResponseSchema,
  type NuvemshopProduct,
  type NuvemshopOrder,
  type NuvemshopTokenResponse,
  type NuvemshopWebhookResponse,
} from './types'

const NUVEMSHOP_API_BASE = 'https://api.tiendanube.com/v1'
const NUVEMSHOP_AUTH_URL = 'https://www.tiendanube.com/apps/authorize/token'
const MIN_REQUEST_INTERVAL = 500 // 500ms between requests (2 req/sec)

export class NuvemshopClient {
  private accessToken: string
  private storeId: string
  private lastRequestAt = 0

  constructor(storeId: string, accessToken: string) {
    this.storeId = storeId
    this.accessToken = accessToken
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestAt
    if (elapsed < MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed))
    }
    this.lastRequestAt = Date.now()
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    await this.rateLimit()

    const url = `${NUVEMSHOP_API_BASE}/${this.storeId}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authentication: `bearer ${this.accessToken}`,
        'User-Agent': 'Snew Relay (contato@snew.io)',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new NuvemshopApiError(
        `Nuvemshop API error: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      )
    }

    return response.json() as Promise<T>
  }

  // Products
  async getProducts(page = 1, perPage = 200): Promise<NuvemshopProduct[]> {
    const data = await this.request<unknown[]>(
      `/products?page=${page}&per_page=${perPage}&fields=id,name,description,handle,variants,images,published,updated_at,created_at`
    )
    return data.map((item) => NuvemshopProductSchema.parse(item))
  }

  async getProduct(productId: number): Promise<NuvemshopProduct> {
    const data = await this.request<unknown>(`/products/${productId}`)
    return NuvemshopProductSchema.parse(data)
  }

  async getAllProducts(): Promise<NuvemshopProduct[]> {
    const allProducts: NuvemshopProduct[] = []
    let page = 1

    while (true) {
      const products = await this.getProducts(page, 200)
      allProducts.push(...products)

      if (products.length < 200) break
      page++
    }

    return allProducts
  }

  // Orders
  async getOrders(
    page = 1,
    perPage = 50,
    params?: { created_at_min?: string }
  ): Promise<NuvemshopOrder[]> {
    let url = `/orders?page=${page}&per_page=${perPage}`
    if (params?.created_at_min) {
      url += `&created_at_min=${params.created_at_min}`
    }
    const data = await this.request<unknown[]>(url)
    return data.map((item) => NuvemshopOrderSchema.parse(item))
  }

  async getOrder(orderId: number): Promise<NuvemshopOrder> {
    const data = await this.request<unknown>(`/orders/${orderId}`)
    return NuvemshopOrderSchema.parse(data)
  }

  // Webhooks
  async createWebhook(event: string, url: string): Promise<NuvemshopWebhookResponse> {
    const data = await this.request<unknown>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ event, url }),
    })
    return NuvemshopWebhookResponseSchema.parse(data)
  }

  async listWebhooks(): Promise<NuvemshopWebhookResponse[]> {
    const data = await this.request<unknown[]>('/webhooks')
    return data.map((item) => NuvemshopWebhookResponseSchema.parse(item))
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.request(`/webhooks/${webhookId}`, { method: 'DELETE' })
  }

  // OAuth token exchange (static method, no instance needed)
  static async exchangeCodeForToken(code: string): Promise<NuvemshopTokenResponse> {
    const appId = process.env.NUVEMSHOP_APP_ID
    const clientSecret = process.env.NUVEMSHOP_CLIENT_SECRET

    if (!appId || !clientSecret) {
      throw new Error('NUVEMSHOP_APP_ID and NUVEMSHOP_CLIENT_SECRET must be set')
    }

    const response = await fetch(NUVEMSHOP_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: appId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new NuvemshopApiError(
        `Token exchange failed: ${response.status}`,
        response.status,
        errorBody
      )
    }

    const data = await response.json()
    return NuvemshopTokenResponseSchema.parse(data)
  }
}

export class NuvemshopApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message)
    this.name = 'NuvemshopApiError'
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isRateLimited(): boolean {
    return this.status === 429
  }
}
