import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { runAnalysisPipeline } from '@/lib/onboarding/analysis-pipeline'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  // 1. Auth: get user from session
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get team membership
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  const teamId = membership.team_id

  // 3. Get storeId — always resolve from team ownership (ignore body.store_id to prevent IDOR)
  let storeId: string | null = null

  if (!storeId) {
    const serviceClient = createServiceRoleClient()
    const { data: store } = await serviceClient
      .from('stores')
      .select('id')
      .eq('team_id', teamId)
      .single()

    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 })
    storeId = store.id
  }

  const finalStoreId = storeId
  const userId = user.id

  // 4. Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const result = await runAnalysisPipeline(
          finalStoreId,
          teamId,
          (update) => {
            sendEvent('step', update)
          },
          userId
        )
        sendEvent('done', { brandDnaId: result.brandDnaId, redirect: '/onboarding/brand-dna' })
      } catch (err) {
        sendEvent('error', {
          message: err instanceof Error ? err.message : 'Erro na análise',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
