import { NextResponse } from 'next/server'

// See src/app/api/stripe/checkout/route.ts — billing is disabled.

export async function POST() {
  return NextResponse.json(
    { error: 'billing_disabled', message: 'Billing integration is temporarily disabled.' },
    { status: 501 }
  )
}
