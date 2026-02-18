import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { planIdFromPriceId } from '@/lib/stripe/plans'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // 1. Read raw body and verify signature
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 2. Service role client (no await — synchronous)
  const supabase = createServiceRoleClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const teamId = session.metadata?.team_id
        if (!teamId || !session.subscription) break

        // Fetch full subscription object from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string)
        const firstItem = stripeSub.items.data[0]
        const priceId = firstItem?.price.id ?? null
        const planId = priceId ? (planIdFromPriceId(priceId) ?? 'free') : 'free'
        const periodStart = firstItem?.current_period_start
          ? new Date(firstItem.current_period_start * 1000).toISOString()
          : null
        const periodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : null

        await supabase.from('subscriptions').upsert(
          {
            team_id: teamId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: stripeSub.id,
            stripe_price_id: priceId,
            plan_id: planId,
            status: stripeSub.status,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: stripeSub.cancel_at_period_end,
          },
          { onConflict: 'team_id' }
        )

        await supabase.from('teams').update({ plan_id: planId }).eq('id', teamId)

        // Upsert usage limits for current period
        if (periodStart && periodEnd) {
          await supabase.from('usage').upsert(
            {
              team_id: teamId,
              period_start: periodStart,
              period_end: periodEnd,
            },
            { onConflict: 'team_id' }
          )
        }

        break
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription
        const priceId = stripeSub.items.data[0]?.price.id ?? null
        const planId = priceId ? (planIdFromPriceId(priceId) ?? 'free') : 'free'

        // Find the subscription row by stripe_subscription_id
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('team_id')
          .eq('stripe_subscription_id', stripeSub.id)
          .single()

        if (!subRow) break

        const updatedItem = stripeSub.items.data[0]
        const updatedPeriodStart = updatedItem?.current_period_start
          ? new Date(updatedItem.current_period_start * 1000).toISOString()
          : null
        const updatedPeriodEnd = updatedItem?.current_period_end
          ? new Date(updatedItem.current_period_end * 1000).toISOString()
          : null

        await supabase
          .from('subscriptions')
          .update({
            plan_id: planId,
            status: stripeSub.status,
            stripe_price_id: priceId,
            current_period_start: updatedPeriodStart,
            current_period_end: updatedPeriodEnd,
            cancel_at_period_end: stripeSub.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', stripeSub.id)

        await supabase.from('teams').update({ plan_id: planId }).eq('id', subRow.team_id)

        break
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription

        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('team_id')
          .eq('stripe_subscription_id', stripeSub.id)
          .single()

        if (!subRow) break

        await supabase
          .from('subscriptions')
          .update({
            plan_id: 'free',
            status: 'canceled',
            stripe_subscription_id: null,
            stripe_price_id: null,
            cancel_at_period_end: false,
          })
          .eq('stripe_subscription_id', stripeSub.id)

        await supabase.from('teams').update({ plan_id: 'free' }).eq('id', subRow.team_id)

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', customerId)

        break
      }

      default:
        // Unhandled event type — ignore
        break
    }
  } catch (error) {
    console.error(`Stripe webhook handler error for event ${event.type}:`, error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return new NextResponse(null, { status: 200 })
}
