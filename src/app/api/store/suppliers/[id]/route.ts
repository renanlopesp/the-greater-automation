import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  lead_time_days: z.number().int().min(1).max(365).optional(),
  min_order_value: z.number().min(0).nullable().optional(),
  payment_terms: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

async function getStoreForUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return { error: 'No team', status: 400 } as const

  const serviceClient = createServiceRoleClient()
  const { data: store } = await serviceClient
    .from('stores')
    .select('id')
    .eq('team_id', teamId)
    .single()
  if (!store) return { error: 'No store', status: 404 } as const

  return { store, serviceClient } as const
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await getStoreForUser()
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: result.status })
  const { store, serviceClient } = result
  const { id } = await params

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { data: supplier, error } = await serviceClient
    .from('store_suppliers')
    .update(parsed.data)
    .eq('id', id)
    .eq('store_id', store.id)
    .select()
    .single()

  if (error || !supplier) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  return NextResponse.json(supplier)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getStoreForUser()
  if ('error' in result)
    return NextResponse.json({ error: result.error }, { status: result.status })
  const { store, serviceClient } = result
  const { id } = await params

  const { error } = await serviceClient
    .from('store_suppliers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('store_id', store.id)

  if (error) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
