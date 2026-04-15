import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Global proxy (Next.js 16 middleware) — auth + security headers.
 *
 * Route categories:
 * 1. PROTECTED PAGES: /dashboard, /workspace, etc. — redirect to /login if no session
 * 2. PROTECTED API: /api/* (default) — return 401 JSON if no session
 * 3. SELF-AUTH API: webhooks, cron, sync — they handle their own auth (HMAC, secrets, tokens)
 * 4. PUBLIC: /login, /signup, /auth/callback — no auth needed
 */

const protectedPrefixes = [
  '/dashboard',
  '/workspace',
  '/runs',
  '/agents',
  '/workflows',
  '/skills',
  '/chat',
  '/studio',
  '/apps',
  '/history',
  '/notifications',
  '/products',
  '/suppliers',
  '/messaging',
  '/customer-service',
  '/onboarding',
  '/settings',
]

// API routes that handle their own authentication (webhook signatures, cron secrets, tokens)
// These are NOT checked by the proxy — they verify auth internally
const SELF_AUTHENTICATED_API_PREFIXES = [
  '/api/nuvemshop/webhook',
  '/api/nuvemshop/cron',
  '/api/nuvemshop/sync',
  '/api/nuvemshop/callback',
  '/api/composio/webhook',
  '/api/stripe/webhook',
  '/api/agent-workflows/cron',
  '/api/agent-workflows/webhook',
  '/api/agents/cron',
  '/api/store/daily-summary',
  '/api/messaging/telegram/webhook',
  '/api/messaging/telegram/process',
  '/api/workflows/webhook',
  '/api/workflows/test-step',
  '/api/apps/callback',
  '/api/auth',
]

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback']

function isSelfAuthenticatedApi(pathname: string): boolean {
  return SELF_AUTHENTICATED_API_PREFIXES.some((p) => pathname.startsWith(p))
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Security headers on ALL responses
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        // Re-apply security headers after NextResponse.next() recreates the response
        supabaseResponse.headers.set('X-Frame-Options', 'DENY')
        supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
        supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        supabaseResponse.headers.set(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=()'
        )
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Use getUser() not getSession() for server-side auth validation
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // --- Public pages: allow, redirect authenticated users away from auth pages ---
  if (isPublicPath(pathname)) {
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // --- Self-authenticated API routes: skip session check (they verify internally) ---
  if (isSelfAuthenticatedApi(pathname)) {
    return supabaseResponse
  }

  // --- Protected pages: redirect to /login ---
  const isProtectedPage = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // --- Protected API routes: return 401 JSON ---
  if (!user && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
