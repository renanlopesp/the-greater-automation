import { NextResponse } from 'next/server'

// See src/app/api/stripe/checkout/route.ts — billing is disabled. The
// webhook acknowledges with 200 so Stripe stops retrying; all event
// handling is a no-op until the billing surface is redesigned.

export async function POST() {
  return NextResponse.json({ received: true })
}
