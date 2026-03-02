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

    // 2. Parse body
    const body = (await request.json()) as { priceId?: string }
    const { priceId } = body
    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
    }

    const stripe = getStripe()
    const supabase = createServiceRoleClient()

    // 3. Look up existing subscription row for stripe_customer_id
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('team_id', userTeam.teamId)
      .single()

    let customerId = subscription?.stripe_customer_id ?? null

    // 4. If no customer, create one and persist
    if (!customerId) {
      // Get user email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(userTeam.userId)
      const email = userData?.user?.email

      const customer = await stripe.customers.create({
        ...(email ? { email } : {}),
        metadata: { team_id: userTeam.teamId },
      })
      customerId = customer.id

      // Upsert the subscription row with the new customer id
      await supabase.from('subscriptions').upsert(
        {
          team_id: userTeam.teamId,
          stripe_customer_id: customerId,
        },
        { onConflict: 'team_id' }
      )
    }

    // 5. Create Checkout Session
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard`,
      metadata: { team_id: userTeam.teamId },
      subscription_data: { metadata: { team_id: userTeam.teamId } },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
