import { NextRequest, NextResponse } from 'next/server'
import { getUserTeamRole, canMutate } from '@/lib/auth/require-role'
import { getStripe } from '@/lib/stripe/client'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const userTeam = await getUserTeamRole()
    if (!userTeam) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!canMutate(userTeam.role)) {
      return NextResponse.json(
        { error: 'Forbidden: owner or admin role required' },
        { status: 403 }
      )
    }

    const supabase = createServiceRoleClient()

    // 2. Look up stripe_customer_id
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('team_id', userTeam.teamId)
      .single()

    const customerId = subscription?.stripe_customer_id
    if (!customerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
    }

    // 3. Create billing portal session
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
    const stripe = getStripe()

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
