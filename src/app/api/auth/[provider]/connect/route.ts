import { createServerClient } from '@/lib/supabase/server'
import { buildAuthorizeUrl, getOAuthProvider } from '@/lib/oauth/providers'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  try {
    const supabase = await createServerClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify provider is valid
    const providerConfig = getOAuthProvider(provider)
    if (!providerConfig) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }

    // Generate state parameter for CSRF protection
    const state = randomBytes(32).toString('hex')

    // Store state in httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set(`oauth_state_${provider}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Build OAuth authorization URL
    const authorizeUrl = buildAuthorizeUrl(provider, state)
    if (!authorizeUrl) {
      return NextResponse.json({ error: 'Provider not configured' }, { status: 500 })
    }

    // Redirect to provider's authorization page
    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    console.error('OAuth connect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
