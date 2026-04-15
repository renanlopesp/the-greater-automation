import { NextResponse } from 'next/server'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/**
 * In-memory sliding-window rate limiter. Keyed by `scope:identifier`, enforced
 * per runtime instance. Good enough to stop burst abuse on LLM-backed routes;
 * for production-grade quotas, swap in Upstash Redis.
 */
export function checkRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now()
  const key = `${scope}:${identifier}`
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count++
  return { ok: true }
}

/**
 * Opportunistic cleanup — runs on every 100th call to avoid unbounded Map
 * growth in long-lived warm instances.
 */
let cleanupCounter = 0
export function maybeSweep() {
  if (++cleanupCounter % 100 !== 0) return
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
