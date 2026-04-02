import {
  NuvemshopProductSchema,
  NuvemshopOrderSchema,
  NuvemshopTokenResponseSchema,
  NuvemshopWebhookResponseSchema,
  NuvemshopVariantSchema,
  NuvemshopImageSchema,
  NuvemshopCategorySchema,
  NuvemshopCustomerSchema,
  NuvemshopCouponSchema,
  NuvemshopAbandonedCheckoutSchema,
  NuvemshopDraftOrderSchema,
  NuvemshopFulfillmentOrderSchema,
  NuvemshopStoreSchema,
  type NuvemshopProduct,
  type NuvemshopOrder,
  type NuvemshopTokenResponse,
  type NuvemshopWebhookResponse,
  type NuvemshopVariant,
  type NuvemshopImage,
  type NuvemshopCategory,
  type NuvemshopCustomer,
  type NuvemshopCoupon,
  type NuvemshopAbandonedCheckout,
  type NuvemshopDraftOrder,
  type NuvemshopFulfillmentOrder,
  type NuvemshopStore,
} from './types'

const NUVEMSHOP_API_BASE = 'https://api.nuvemshop.com.br/v1'
const NUVEMSHOP_AUTH_URL = 'https://www.nuvemshop.com.br/apps/authorize/token'
const MIN_REQUEST_INTERVAL = 500 // 500ms between requests (2 req/sec)
const MAX_RETRIES = 3

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

  private async request<T>(path: string, options: RequestInit = {}, attempt = 1): Promise<T> {
    await this.rateLimit()

    const url = `${NUVEMSHOP_API_BASE}/${this.storeId}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authentication: `bearer ${this.accessToken}`,
        'User-Agent': 'Snew (contact@snew.ai)',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const resetMs = parseInt(response.headers.get('x-rate-limit-reset') ?? '1000', 10)
      await new Promise((resolve) => setTimeout(resolve, resetMs))
      return this.request<T>(path, options, attempt + 1)
    }

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

  private async requestVoid(path: string, options: RequestInit = {}, attempt = 1): Promise<void> {
    await this.rateLimit()
    const url = `${NUVEMSHOP_API_BASE}/${this.storeId}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authentication: `bearer ${this.accessToken}`,
        'User-Agent': 'Snew (contact@snew.ai)',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const resetMs = parseInt(response.headers.get('x-rate-limit-reset') ?? '1000', 10)
      await new Promise((resolve) => setTimeout(resolve, resetMs))
      return this.requestVoid(path, options, attempt + 1)
    }
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new NuvemshopApiError(
        `Nuvemshop API error: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      )
    }
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

  async deleteProduct(productId: number): Promise<void> {
    await this.requestVoid(`/products/${productId}`, { method: 'DELETE' })
  }

  async updateProduct(
    productId: number,
    product: Partial<{
      name: { pt: string }
      description: { pt: string }
      published: boolean
    }>
  ): Promise<NuvemshopProduct> {
    const data = await this.request<unknown>(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    })
    return NuvemshopProductSchema.parse(data)
  }

  async createProduct(product: {
    name: { pt: string }
    description?: { pt: string }
    variants: Array<{ price: string; stock: number; stock_management: boolean; sku?: string }>
    published?: boolean
  }): Promise<NuvemshopProduct> {
    const data = await this.request<unknown>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    })
    return NuvemshopProductSchema.parse(data)
  }

  async getProductBySku(sku: string): Promise<NuvemshopProduct> {
    const data = await this.request<unknown>(`/products/sku/${encodeURIComponent(sku)}`)
    return NuvemshopProductSchema.parse(data)
  }

  async bulkUpdateStockPrice(
    updates: Array<{
      id: number
      variants: Array<{
        id: number
        price?: number
        inventory_levels?: Array<{ stock: number; location_id?: number }>
      }>
    }>
  ): Promise<unknown> {
    return this.request<unknown>('/products/stock-price', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  // Product Variants
  async getVariants(productId: number): Promise<NuvemshopVariant[]> {
    const data = await this.request<unknown[]>(`/products/${productId}/variants`)
    return data.map((item) => NuvemshopVariantSchema.parse(item))
  }

  async getVariant(productId: number, variantId: number): Promise<NuvemshopVariant> {
    const data = await this.request<unknown>(`/products/${productId}/variants/${variantId}`)
    return NuvemshopVariantSchema.parse(data)
  }

  async createVariant(
    productId: number,
    variant: {
      values: Array<{ pt?: string }>
      price: string
      stock?: number
      sku?: string
      weight?: string
    }
  ): Promise<NuvemshopVariant> {
    const data = await this.request<unknown>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variant),
    })
    return NuvemshopVariantSchema.parse(data)
  }

  async updateVariant(
    productId: number,
    variantId: number,
    data: Partial<{
      price: string
      promotional_price: string
      stock: number
      sku: string
      weight: string
    }>
  ): Promise<NuvemshopVariant> {
    const result = await this.request<unknown>(`/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return NuvemshopVariantSchema.parse(result)
  }

  async deleteVariant(productId: number, variantId: number): Promise<void> {
    await this.requestVoid(`/products/${productId}/variants/${variantId}`, { method: 'DELETE' })
  }

  async updateVariantStock(
    productId: number,
    action: 'replace' | 'variation',
    value: number,
    variantId?: number
  ): Promise<NuvemshopVariant[]> {
    const body: Record<string, unknown> = { action, value }
    if (variantId !== undefined) body.variant_id = variantId
    const data = await this.request<unknown[]>(`/products/${productId}/variants/stock`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return data.map((item) => NuvemshopVariantSchema.parse(item))
  }

  // Product Images
  async getImages(productId: number): Promise<NuvemshopImage[]> {
    const data = await this.request<unknown[]>(`/products/${productId}/images`)
    return data.map((item) => NuvemshopImageSchema.parse(item))
  }

  async createImage(
    productId: number,
    image: { src?: string; attachment?: string; filename?: string; position?: number }
  ): Promise<NuvemshopImage> {
    const data = await this.request<unknown>(`/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify(image),
    })
    return NuvemshopImageSchema.parse(data)
  }

  async deleteImage(productId: number, imageId: number): Promise<void> {
    await this.requestVoid(`/products/${productId}/images/${imageId}`, { method: 'DELETE' })
  }

  // Categories
  async getCategories(params?: {
    page?: number
    per_page?: number
    parent_id?: number
  }): Promise<NuvemshopCategory[]> {
    const query = new URLSearchParams()
    if (params?.page !== undefined) query.set('page', String(params.page))
    if (params?.per_page !== undefined) query.set('per_page', String(params.per_page))
    if (params?.parent_id !== undefined) query.set('parent_id', String(params.parent_id))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await this.request<unknown[]>(`/categories${qs}`)
    return data.map((item) => NuvemshopCategorySchema.parse(item))
  }

  async getCategory(categoryId: number): Promise<NuvemshopCategory> {
    const data = await this.request<unknown>(`/categories/${categoryId}`)
    return NuvemshopCategorySchema.parse(data)
  }

  async createCategory(category: {
    name: { pt: string }
    parent?: number
  }): Promise<NuvemshopCategory> {
    const data = await this.request<unknown>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    })
    return NuvemshopCategorySchema.parse(data)
  }

  async updateCategory(
    categoryId: number,
    data: Partial<{ name: { pt: string }; parent: number }>
  ): Promise<NuvemshopCategory> {
    const result = await this.request<unknown>(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return NuvemshopCategorySchema.parse(result)
  }

  async deleteCategory(categoryId: number): Promise<void> {
    await this.requestVoid(`/categories/${categoryId}`, { method: 'DELETE' })
  }

  // Customers
  async getCustomers(params?: {
    page?: number
    per_page?: number
    q?: string
    email?: string
  }): Promise<NuvemshopCustomer[]> {
    const query = new URLSearchParams()
    if (params?.page !== undefined) query.set('page', String(params.page))
    if (params?.per_page !== undefined) query.set('per_page', String(params.per_page))
    if (params?.q) query.set('q', params.q)
    if (params?.email) query.set('email', params.email)
    query.set(
      'fields',
      'id,name,email,phone,identification,total_spent,total_spent_currency,last_order_id,active,created_at,updated_at'
    )
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await this.request<unknown[]>(`/customers${qs}`)
    return data.map((item) => NuvemshopCustomerSchema.parse(item))
  }

  async getAllCustomers(): Promise<NuvemshopCustomer[]> {
    const all: NuvemshopCustomer[] = []
    let page = 1
    while (true) {
      const customers = await this.getCustomers({ page, per_page: 200 })
      all.push(...customers)
      if (customers.length < 200) break
      page++
    }
    return all
  }

  async getCustomer(customerId: number): Promise<NuvemshopCustomer> {
    const data = await this.request<unknown>(`/customers/${customerId}`)
    return NuvemshopCustomerSchema.parse(data)
  }

  async createCustomer(customer: {
    name: string
    email: string
    phone?: string
    identification?: string
  }): Promise<NuvemshopCustomer> {
    const data = await this.request<unknown>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    })
    return NuvemshopCustomerSchema.parse(data)
  }

  async updateCustomer(
    customerId: number,
    data: Partial<{ name: string; email: string; phone: string }>
  ): Promise<NuvemshopCustomer> {
    const result = await this.request<unknown>(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return NuvemshopCustomerSchema.parse(result)
  }

  async deleteCustomer(customerId: number): Promise<void> {
    await this.requestVoid(`/customers/${customerId}`, { method: 'DELETE' })
  }

  // Coupons
  async getCoupons(params?: {
    page?: number
    per_page?: number
    q?: string
    valid?: boolean
    status?: string
  }): Promise<NuvemshopCoupon[]> {
    const query = new URLSearchParams()
    if (params?.page !== undefined) query.set('page', String(params.page))
    if (params?.per_page !== undefined) query.set('per_page', String(params.per_page))
    if (params?.q) query.set('q', params.q)
    if (params?.valid !== undefined) query.set('valid', String(params.valid))
    if (params?.status) query.set('status', params.status)
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await this.request<unknown[]>(`/coupons${qs}`)
    return data.map((item) => NuvemshopCouponSchema.parse(item))
  }

  async getCoupon(couponId: number): Promise<NuvemshopCoupon> {
    const data = await this.request<unknown>(`/coupons/${couponId}`)
    return NuvemshopCouponSchema.parse(data)
  }

  async createCoupon(coupon: {
    code: string
    type: 'percentage' | 'absolute' | 'shipping'
    value?: string
    start_date?: string
    end_date?: string
    min_price?: string
    max_uses?: number
    includes_shipping?: boolean
    categories?: number[]
    products?: number[]
  }): Promise<NuvemshopCoupon> {
    const data = await this.request<unknown>('/coupons', {
      method: 'POST',
      body: JSON.stringify(coupon),
    })
    return NuvemshopCouponSchema.parse(data)
  }

  async updateCoupon(
    couponId: number,
    data: Partial<{
      code: string
      value: string
      valid: boolean
      start_date: string
      end_date: string
    }>
  ): Promise<NuvemshopCoupon> {
    const result = await this.request<unknown>(`/coupons/${couponId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return NuvemshopCouponSchema.parse(result)
  }

  async deleteCoupon(couponId: number): Promise<void> {
    await this.requestVoid(`/coupons/${couponId}`, { method: 'DELETE' })
  }

  // Orders
  async getOrders(
    page = 1,
    perPage = 50,
    params?: { created_at_min?: string; created_at_max?: string; status?: string }
  ): Promise<NuvemshopOrder[]> {
    let url = `/orders?page=${page}&per_page=${perPage}`
    if (params?.created_at_min) {
      url += `&created_at_min=${params.created_at_min}`
    }
    if (params?.created_at_max) {
      url += `&created_at_max=${params.created_at_max}`
    }
    if (params?.status) {
      url += `&status=${params.status}`
    }
    const data = await this.request<unknown[]>(url)
    return data.map((item) => NuvemshopOrderSchema.parse(item))
  }

  async getOrder(orderId: number): Promise<NuvemshopOrder> {
    const data = await this.request<unknown>(`/orders/${orderId}`)
    return NuvemshopOrderSchema.parse(data)
  }

  async createOrder(order: {
    products: Array<{ variant_id: number; quantity: number }>
    customer: { name: string; email: string }
    billing_address: Record<string, string>
    shipping_address: Record<string, string>
    gateway: string
    shipping: string
    shipping_option: string
    shipping_cost_customer: string
    shipping_pickup_type: 'ship' | 'pickup'
  }): Promise<NuvemshopOrder> {
    const data = await this.request<unknown>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    })
    return NuvemshopOrderSchema.parse(data)
  }

  async updateOrder(
    orderId: number,
    data: { owner_note?: string; status?: string }
  ): Promise<NuvemshopOrder> {
    const result = await this.request<unknown>(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return NuvemshopOrderSchema.parse(result)
  }

  async closeOrder(orderId: number): Promise<NuvemshopOrder> {
    const data = await this.request<unknown>(`/orders/${orderId}/close`, { method: 'POST' })
    return NuvemshopOrderSchema.parse(data)
  }

  async openOrder(orderId: number): Promise<NuvemshopOrder> {
    const data = await this.request<unknown>(`/orders/${orderId}/open`, { method: 'POST' })
    return NuvemshopOrderSchema.parse(data)
  }

  async cancelOrder(
    orderId: number,
    params?: { reason?: string; email?: boolean; restock?: boolean }
  ): Promise<NuvemshopOrder> {
    const data = await this.request<unknown>(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: params ? JSON.stringify(params) : undefined,
    })
    return NuvemshopOrderSchema.parse(data)
  }

  // Abandoned Checkouts
  async getAbandonedCheckouts(params?: {
    page?: number
    per_page?: number
  }): Promise<NuvemshopAbandonedCheckout[]> {
    const query = new URLSearchParams()
    if (params?.page !== undefined) query.set('page', String(params.page))
    if (params?.per_page !== undefined) query.set('per_page', String(params.per_page))
    const qs = query.toString() ? `?${query.toString()}` : ''
    const data = await this.request<unknown[]>(`/checkouts${qs}`)
    return data.map((item) => NuvemshopAbandonedCheckoutSchema.parse(item))
  }

  async getAbandonedCheckout(checkoutId: number): Promise<NuvemshopAbandonedCheckout> {
    const data = await this.request<unknown>(`/checkouts/${checkoutId}`)
    return NuvemshopAbandonedCheckoutSchema.parse(data)
  }

  // Draft Orders
  async getDraftOrders(): Promise<NuvemshopDraftOrder[]> {
    const data = await this.request<unknown[]>('/draft_orders')
    return data.map((item) => NuvemshopDraftOrderSchema.parse(item))
  }

  async getDraftOrder(draftOrderId: number): Promise<NuvemshopDraftOrder> {
    const data = await this.request<unknown>(`/draft_orders/${draftOrderId}`)
    return NuvemshopDraftOrderSchema.parse(data)
  }

  async createDraftOrder(order: {
    contact_name: string
    contact_lastname: string
    contact_email: string
    payment_status: 'unpaid' | 'pending_confirmation' | 'paid'
    products: Array<{ variant_id: number; quantity: number }>
    note?: string
  }): Promise<NuvemshopDraftOrder> {
    const data = await this.request<unknown>('/draft_orders', {
      method: 'POST',
      body: JSON.stringify(order),
    })
    return NuvemshopDraftOrderSchema.parse(data)
  }

  async confirmDraftOrder(draftOrderId: number): Promise<NuvemshopOrder> {
    const data = await this.request<unknown>(`/draft_orders/${draftOrderId}/confirm`, {
      method: 'POST',
    })
    return NuvemshopOrderSchema.parse(data)
  }

  async deleteDraftOrder(draftOrderId: number): Promise<void> {
    await this.requestVoid(`/draft_orders/${draftOrderId}`, { method: 'DELETE' })
  }

  // Fulfillment Orders
  async getFulfillmentOrders(orderId: number): Promise<NuvemshopFulfillmentOrder[]> {
    const data = await this.request<unknown[]>(`/orders/${orderId}/fulfillment-orders`)
    return data.map((item) => NuvemshopFulfillmentOrderSchema.parse(item))
  }

  async updateFulfillmentOrder(
    orderId: number,
    fulfillmentId: number,
    data: {
      status?: string
      tracking_number?: string
      tracking_url?: string
      shipping_company?: string
    }
  ): Promise<NuvemshopFulfillmentOrder> {
    const result = await this.request<unknown>(
      `/orders/${orderId}/fulfillment-orders/${fulfillmentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
    return NuvemshopFulfillmentOrderSchema.parse(result)
  }

  // Store
  async getStoreInfo(): Promise<NuvemshopStore> {
    const data = await this.request<unknown>('/store')
    return NuvemshopStoreSchema.parse(data)
  }

  // Payment Options
  async getPaymentOptions(): Promise<
    Array<{
      id: number
      name: string
      logo_url: string
      checkout_payment_options: Array<{ id: number; name: string }>
    }>
  > {
    return this.request('/payment_options')
  }

  // Transactions
  async getTransactions(orderId: number): Promise<
    Array<{
      id: number
      payment_provider_id: string
      payment_method: { type: string }
      status: string
      amount: { value: string; currency: string }
      created_at: string
    }>
  > {
    return this.request(`/orders/${orderId}/transactions`)
  }

  // Pages
  async getPages(params?: { per_page?: number; page?: number }): Promise<
    Array<{
      id: number
      title: Record<string, string>
      handle: Record<string, string>
      content: Record<string, string>
      published: boolean
      created_at: string
      updated_at: string
    }>
  > {
    const qs = new URLSearchParams()
    if (params?.per_page) qs.set('per_page', String(params.per_page))
    if (params?.page) qs.set('page', String(params.page))
    const q = qs.toString()
    return this.request(`/pages${q ? `?${q}` : ''}`)
  }

  async getPage(id: number): Promise<{
    id: number
    title: Record<string, string>
    handle: Record<string, string>
    content: Record<string, string>
    published: boolean
    created_at: string
    updated_at: string
  }> {
    return this.request(`/pages/${id}`)
  }

  async createPage(data: {
    title: Record<string, string>
    content?: Record<string, string>
    handle?: Record<string, string>
    published?: boolean
  }): Promise<{ id: number }> {
    return this.request('/pages', { method: 'POST', body: JSON.stringify(data) })
  }

  async updatePage(
    id: number,
    data: { title?: Record<string, string>; content?: Record<string, string>; published?: boolean }
  ): Promise<{ id: number }> {
    return this.request(`/pages/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deletePage(id: number): Promise<void> {
    await this.requestVoid(`/pages/${id}`, { method: 'DELETE' })
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

  async updateWebhook(
    webhookId: number,
    data: { url?: string; event?: string }
  ): Promise<NuvemshopWebhookResponse> {
    const result = await this.request<unknown>(`/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return NuvemshopWebhookResponseSchema.parse(result)
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    await this.requestVoid(`/webhooks/${webhookId}`, { method: 'DELETE' })
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
