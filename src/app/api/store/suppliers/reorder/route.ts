import { NextResponse } from 'next/server'

// See src/app/api/store/suppliers/route.ts — the reorder workflow depends
// on `store_product_suppliers` + `store_suppliers.min_order_value`, neither
// of which exists in the current production schema.

export async function GET() {
  return NextResponse.json(
    {
      error: 'suppliers_feature_disabled',
      message: 'Reorder suggestions are temporarily disabled pending schema review.',
    },
    { status: 501 }
  )
}
