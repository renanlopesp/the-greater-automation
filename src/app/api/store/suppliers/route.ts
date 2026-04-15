import { NextResponse } from 'next/server'

/**
 * Suppliers feature is disabled since the 2026-04-15 schema refactor.
 * The `store_product_suppliers` linking table no longer exists and
 * `store_suppliers` lost the `is_active` column it used to gate. See
 * `supabase/migrations-legacy-20260415/README.md` and spec 071.
 *
 * If the feature is revived, restore the legacy shape via a fresh
 * migration and re-implement the handlers against the new schema.
 */
const DISABLED_BODY = {
  error: 'suppliers_feature_disabled',
  message: 'Supplier management is temporarily disabled pending schema review.',
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
