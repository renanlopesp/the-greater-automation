import { NextResponse } from 'next/server'

// See src/app/api/store/suppliers/route.ts for context — the suppliers
// feature is disabled pending schema review after the 2026-04-15 refactor.

const DISABLED_BODY = {
  error: 'suppliers_feature_disabled',
  message: 'Supplier management is temporarily disabled pending schema review.',
} as const

export async function GET() {
  return NextResponse.json(DISABLED_BODY, { status: 501 })
}

export async function PATCH() {
  return NextResponse.json(DISABLED_BODY, { status: 501 })
}

export async function DELETE() {
  return NextResponse.json(DISABLED_BODY, { status: 501 })
}
