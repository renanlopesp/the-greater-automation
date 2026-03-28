import { NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NuvemshopClient } from '@/lib/nuvemshop/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/store/products/images')

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const { data: store } = await serviceClient
    .from('stores')
    .select('name, platform, platform_store_id, platform_access_token')
    .eq('team_id', membership.team_id)
    .single()

  if (!store || !store.platform_access_token || !store.platform_store_id) {
    return NextResponse.json({ error: 'No store found' }, { status: 404 })
  }

  try {
    const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
    const products = await client.getProducts(1, 6)

    const images = products
      .filter((p) => {
        const imgs = p.images as Array<{ src: string }> | undefined
        return imgs && imgs.length > 0
      })
      .slice(0, 6)
      .map((p) => {
        const imgs = p.images as Array<{ src: string }>
        const name =
          typeof p.name === 'object' && p.name !== null
            ? (p.name as Record<string, string>).pt || Object.values(p.name)[0] || ''
            : String(p.name || '')
        const slug = name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
        return {
          name: `${slug}.jpg`,
          url: imgs[0].src,
          label: 'Produto',
          productName: name,
        }
      })

    return NextResponse.json({ images, storeName: store.name || 'Loja' })
  } catch (err) {
    log.error({ err }, 'Error fetching product images')
    return NextResponse.json({ images: [], storeName: store.name || 'Loja' })
  }
}
