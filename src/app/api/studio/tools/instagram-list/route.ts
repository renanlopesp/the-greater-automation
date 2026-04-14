import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'

/**
 * Debug endpoint — lists Instagram tool slugs available in the current
 * Composio workspace so we can plug the real slugs into postToApp.
 */
export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const composio = getComposio()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolsApi = (composio as any).tools
    const raw = await toolsApi.getRawComposioTools({ toolkits: ['instagram'], limit: 50 })
    const items = Array.isArray(raw) ? raw : (raw?.items ?? [])
    return NextResponse.json({
      count: items.length,
      tools: items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ({
          slug: t.slug ?? t.name ?? t.toolSlug,
          name: t.displayName ?? t.title,
          deprecated: !!t.deprecated,
          description: (t.description ?? '').slice(0, 120),
        })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message ?? 'unknown') },
      { status: 500 }
    )
  }
}
