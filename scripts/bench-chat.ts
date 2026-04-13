/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Benchmark script for /api/chat endpoint.
 *
 * Usage:
 *   BENCH_COOKIE="sb-access-token=<token>; sb-refresh-token=<token>" \
 *     bunx tsx scripts/bench-chat.ts [baseUrl]
 *
 * BENCH_COOKIE: raw cookie string copied from browser DevTools → Application → Cookies.
 * baseUrl defaults to http://localhost:3000.
 *
 * Prints P50/P95 TTFT and total duration segmented by X-Chat-Engine header.
 */

const baseUrl = process.argv[2] ?? 'http://localhost:3000'
const cookie = process.env.BENCH_COOKIE ?? ''

const MESSAGES = ['Olá', 'Quanto vendi hoje?']
const RUNS = 10

interface RunResult {
  ttft: number
  total: number
  engine: string
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function fmt(ms: number): string {
  return (ms / 1000).toFixed(2) + 's'
}

async function runOnce(message: string): Promise<RunResult> {
  const t0 = Date.now()
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ message, conversationId: null }),
  })

  const engine = res.headers.get('X-Chat-Engine') ?? 'unknown'
  const ttfb = Date.now() - t0

  const contentType = res.headers.get('content-type') ?? ''
  const isSSE = contentType.includes('text/event-stream')

  if (!isSSE) {
    // Non-SSE: consume body and use TTFB as TTFT
    await res.text()
    return { ttft: ttfb, total: Date.now() - t0, engine }
  }

  // SSE: stream line by line, find first text-delta
  let ttft = 0
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  outer: while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!ttft && line.startsWith('data: ')) {
        try {
          const payload = JSON.parse(line.slice(6)) as any
          if (payload?.type === 'text-delta') {
            ttft = Date.now() - t0
          }
        } catch {
          // not JSON, skip
        }
      }
      if (line === 'data: [DONE]') break outer
    }
  }

  if (!ttft) ttft = ttfb // fallback if no text-delta seen
  return { ttft, total: Date.now() - t0, engine }
}

async function main() {
  // Map: message -> engine -> RunResult[]
  const results = new Map<string, Map<string, RunResult[]>>()

  for (const message of MESSAGES) {
    const byEngine = new Map<string, RunResult[]>()
    results.set(message, byEngine)
    process.stdout.write(`\nBenching "${message}" (${RUNS} runs)... `)
    for (let i = 0; i < RUNS; i++) {
      const r = await runOnce(message)
      if (!byEngine.has(r.engine)) byEngine.set(r.engine, [])
      byEngine.get(r.engine)!.push(r)
      process.stdout.write('.')
    }
    process.stdout.write(' done\n')
  }

  // Print table
  const col = (s: string, w: number) => s.padEnd(w)
  const header = [
    col('Message', 22),
    col('Engine', 18),
    col('N', 4),
    col('P50 ttft', 10),
    col('P95 ttft', 10),
    col('P50 total', 11),
    col('P95 total', 11),
  ].join('| ')
  const sep = '-'.repeat(header.length)

  console.log('\n' + sep)
  console.log(header)
  console.log(sep)

  for (const message of MESSAGES) {
    const byEngine = results.get(message)!
    for (const [engine, runs] of byEngine) {
      const ttfts = runs.map((r) => r.ttft).sort((a, b) => a - b)
      const totals = runs.map((r) => r.total).sort((a, b) => a - b)
      console.log(
        [
          col(message, 22),
          col(engine, 18),
          col(String(runs.length), 4),
          col(fmt(percentile(ttfts, 50)), 10),
          col(fmt(percentile(ttfts, 95)), 10),
          col(fmt(percentile(totals, 50)), 11),
          col(fmt(percentile(totals, 95)), 11),
        ].join('| ')
      )
    }
  }
  console.log(sep)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
