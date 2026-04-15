import { NextResponse } from 'next/server'

// Stripe billing is not wired up against the current schema. The legacy
// tables (`subscriptions`) and columns (`teams.stripe_customer_id`) were
// removed in the 2026-04-15 project move. This endpoint returns 501 until
// the billing surface is redesigned.

export async function POST() {
  return NextResponse.json(
    { error: 'billing_disabled', message: 'Billing integration is temporarily disabled.' },
    { status: 501 }
  )
}
