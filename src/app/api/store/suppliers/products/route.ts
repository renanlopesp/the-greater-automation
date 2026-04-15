import { NextResponse } from 'next/server'

// See src/app/api/store/suppliers/route.ts — the `store_product_suppliers`
// table does not exist in the current production schema. This endpoint is
// disabled until the relationship is redesigned.

const DISABLED_BODY = {
  error: 'suppliers_feature_disabled',
  message: 'Supplier-product linking is temporarily disabled pending schema review.',
} as const

export async function GET() {
  return NextResponse.json(DISABLED_BODY, { status: 501 })
}

export async function POST() {
  return NextResponse.json(DISABLED_BODY, { status: 501 })
}

export async function PATCH() {
  return NextResponse.json(DISABLED_BODY, { status: 501 })
}

export async function DELETE() {
  return NextResponse.json(DISABLED_BODY, { status: 501 })
}
