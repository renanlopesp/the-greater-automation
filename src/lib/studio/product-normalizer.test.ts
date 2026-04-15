import { describe, expect, it } from 'vitest'
import { fromNuvemshop, fromShopifyComposio, NormalizedProductSchema } from './product-normalizer'

describe('fromNuvemshop', () => {
  it('projects a typical Nuvemshop product', () => {
    const result = fromNuvemshop({
      id: 12345,
      name: { pt: 'Body bordado rosa', es: 'Body bordado rosa', en: 'Pink embroidered bodysuit' },
      handle: 'body-bordado-rosa',
      images: [{ src: 'https://acdn.nuvemshop.com.br/1.jpg' }],
      variants: [{ price: '129.90' }],
    })
    expect(result).toEqual({
      id: '12345',
      name: 'Body bordado rosa',
      image: 'https://acdn.nuvemshop.com.br/1.jpg',
      price: '129.90',
      handle: 'body-bordado-rosa',
      source: 'nuvemshop',
    })
    expect(NormalizedProductSchema.safeParse(result).success).toBe(true)
  })

  it('falls back to es when pt localised name is missing', () => {
    const result = fromNuvemshop({
      id: 1,
      name: { es: 'Camisa', en: 'Shirt' },
      images: [{ src: 'https://x/a.jpg' }],
      variants: [{ price: '10' }],
    })
    expect(result?.name).toBe('Camisa')
  })

  it('falls back to first-available string when pt and es both missing', () => {
    const result = fromNuvemshop({
      id: 1,
      name: { en: 'Shirt' },
      images: [{ src: 'https://x/a.jpg' }],
      variants: [{ price: '10' }],
    })
    expect(result?.name).toBe('Shirt')
  })

  it('coerces empty images array to image: null', () => {
    const result = fromNuvemshop({
      id: 1,
      name: { pt: 'X' },
      images: [],
      variants: [{ price: '10' }],
    })
    expect(result?.image).toBeNull()
  })

  it('coerces missing variants to price: null', () => {
    const result = fromNuvemshop({
      id: 1,
      name: { pt: 'X' },
      images: [{ src: 'https://x/a.jpg' }],
    })
    expect(result?.price).toBeNull()
  })

  it('coerces non-http image to null', () => {
    const result = fromNuvemshop({
      id: 1,
      name: { pt: 'X' },
      images: [{ src: 'javascript:alert(1)' }],
      variants: [{ price: '10' }],
    })
    expect(result?.image).toBeNull()
  })

  it('defaults empty name to "Produto sem nome"', () => {
    const result = fromNuvemshop({
      id: 1,
      name: { pt: '' },
      images: [{ src: 'https://x/a.jpg' }],
      variants: [{ price: '10' }],
    })
    expect(result?.name).toBe('Produto sem nome')
  })

  it('returns null when id is missing', () => {
    expect(
      fromNuvemshop({
        name: { pt: 'X' },
        images: [{ src: 'https://x/a.jpg' }],
        variants: [{ price: '10' }],
      })
    ).toBeNull()
  })

  it('returns null for non-object input', () => {
    expect(fromNuvemshop(null)).toBeNull()
    expect(fromNuvemshop(undefined)).toBeNull()
    expect(fromNuvemshop('string')).toBeNull()
  })
})

describe('fromShopifyComposio', () => {
  it('projects a typical Shopify product with gid', () => {
    const result = fromShopifyComposio({
      id: 'gid://shopify/Product/123',
      title: 'Summer tee',
      handle: 'summer-tee',
      image: { src: 'https://cdn.shopify.com/1.jpg' },
      variants: [{ price: '29.99' }],
    })
    expect(result).toEqual({
      id: 'gid://shopify/Product/123',
      name: 'Summer tee',
      image: 'https://cdn.shopify.com/1.jpg',
      price: '29.99',
      handle: 'summer-tee',
      source: 'shopify-composio',
    })
  })

  it('falls back to images[] when image is missing', () => {
    const result = fromShopifyComposio({
      id: '123',
      title: 'Shirt',
      images: [
        { src: 'https://cdn.shopify.com/hero.jpg' },
        { src: 'https://cdn.shopify.com/b.jpg' },
      ],
      variants: [{ price: '10' }],
    })
    expect(result?.image).toBe('https://cdn.shopify.com/hero.jpg')
  })

  it('coerces missing image.src to null', () => {
    const result = fromShopifyComposio({
      id: '1',
      title: 'Shirt',
      image: null,
      variants: [{ price: '10' }],
    })
    expect(result?.image).toBeNull()
  })

  it('coerces missing variants to price: null', () => {
    const result = fromShopifyComposio({
      id: '1',
      title: 'Shirt',
      image: { src: 'https://cdn/a.jpg' },
    })
    expect(result?.price).toBeNull()
  })

  it('returns null when id is missing', () => {
    expect(
      fromShopifyComposio({
        title: 'X',
        image: { src: 'https://x/a.jpg' },
      })
    ).toBeNull()
  })

  it('stringifies numeric ids', () => {
    const result = fromShopifyComposio({
      id: 1234567890,
      title: 'X',
      image: { src: 'https://x/a.jpg' },
      variants: [{ price: '10' }],
    })
    expect(result?.id).toBe('1234567890')
    expect(typeof result?.id).toBe('string')
  })
})
