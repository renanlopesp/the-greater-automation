import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { provisionStore } from '@/lib/retail/provision-store'
import {
  SEGMENTS,
  PLATFORMS,
  PRIORITIES,
  type Segment,
  type Platform,
  type Priority,
} from '@/lib/retail/segment-skills'
import { z } from 'zod'

const CreateStoreSchema = z.object({
  store_name: z.string().min(2).max(100),
  segment: z.enum(SEGMENTS as unknown as [string, ...string[]]) as z.ZodType<Segment>,
  platform: z.enum(PLATFORMS as unknown as [string, ...string[]]) as z.ZodType<Platform>,
  platform_url: z.string().url().optional().or(z.literal('')),
  priorities: z
    .array(z.enum(PRIORITIES as unknown as [string, ...string[]]) as z.ZodType<Priority>)
    .optional()
    .default([]),
})

// POST /api/onboarding — Create store and provision agents
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's team
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ error: 'No team found' }, { status: 400 })
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only team owners can create stores' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateStoreSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await provisionStore({
      userId: user.id,
      teamId: membership.team_id,
      storeName: parsed.data.store_name,
      segment: parsed.data.segment,
      platform: parsed.data.platform,
      platformUrl: parsed.data.platform_url || undefined,
      priorities: parsed.data.priorities,
    })

    return NextResponse.json(
      {
        store_id: result.storeId,
        agents_created: result.agentsCreated,
        skills_created: result.skillsCreated,
        next_step: 'telegram_link',
      },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('already exists')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    console.error('[api/onboarding] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/onboarding — Check onboarding status
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
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ has_store: false, onboarding_completed: false })

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, segment, platform, onboarding_completed')
    .eq('team_id', membership.team_id)
    .single()

  if (!store) return NextResponse.json({ has_store: false, onboarding_completed: false })

  return NextResponse.json({
    has_store: true,
    onboarding_completed: store.onboarding_completed,
    store: { id: store.id, name: store.name, segment: store.segment, platform: store.platform },
  })
}
