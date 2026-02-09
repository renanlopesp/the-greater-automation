import { notFound, redirect } from 'next/navigation'
import { subMonths, format } from 'date-fns'
import { MessageSquare, TrendingUp } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import AgentAvatar from '@/components/agent-detail/agent-avatar'
import AgentInfo from '@/components/agent-detail/agent-info'
import SkillsList from '@/components/agent-detail/skills-list'
import ChatInput from '@/components/agent-detail/chat-input'
import ActivityHeatmap from '@/components/agent-detail/activity-heatmap'
import ConnectionIndicators from '@/components/agent-detail/connection-indicators'
import RunHistory from '@/components/agent-detail/run-history'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch agent
  const { data: agent } = await supabase.from('agents').select('*').eq('id', id).single()

  if (!agent) notFound()

  // Parallel data fetching
  const sixMonthsAgo = subMonths(new Date(), 6)

  const [skillsResult, runsResult, recentRunsResult] = await Promise.all([
    // Skills with workflow info
    supabase
      .from('agent_skills')
      .select('id, name, last_run_at, workflow_id, workflows(name, emoji)')
      .eq('agent_id', id)
      .order('created_at', { ascending: true }),

    // Runs for heatmap (last 6 months)
    supabase
      .from('workflow_runs')
      .select('started_at')
      .eq('agent_id', id)
      .gte('started_at', sixMonthsAgo.toISOString())
      .order('started_at', { ascending: false }),

    // Recent runs for history
    supabase
      .from('workflow_runs')
      .select(
        'id, status, steps_used, ai_credits_used, started_at, completed_at, workflow_id, workflows(name, emoji)'
      )
      .eq('agent_id', id)
      .order('started_at', { ascending: false })
      .limit(20),
  ])

  // Build heatmap data
  const heatmapData = new Map<string, number>()
  if (runsResult.data) {
    for (const run of runsResult.data) {
      if (run.started_at) {
        const day = format(new Date(run.started_at), 'yyyy-MM-dd')
        heatmapData.set(day, (heatmapData.get(day) ?? 0) + 1)
      }
    }
  }

  // Transform skills for component
  const skills = (skillsResult.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    last_run_at: s.last_run_at,
    workflow: s.workflows as { name: string; emoji: string } | null,
  }))

  // Transform recent runs for component
  const recentRuns = (recentRunsResult.data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    steps_used: r.steps_used,
    ai_credits_used: Number(r.ai_credits_used),
    started_at: r.started_at ?? '',
    completed_at: r.completed_at,
    workflow: r.workflows as { name: string; emoji: string } | null,
  }))

  const hasRuns = recentRuns.length > 0

  return (
    <div className="mx-auto flex max-w-7xl flex-1 flex-col gap-6 p-6 md:flex-row md:items-stretch">
      {/* Left Card */}
      <aside className="w-full md:w-[360px]">
        <div className="bg-card relative flex h-full min-h-[720px] flex-col overflow-hidden rounded-3xl border shadow-sm">
          <div className="relative flex flex-col items-center gap-4 px-6 pt-10 pb-6">
            <AgentAvatar name={agent.name} />
            <AgentInfo name={agent.name} description={agent.description} />
          </div>

          <ScrollArea className="flex-1 px-6 pb-6">
            <SkillsList skills={skills} agentId={id} />
          </ScrollArea>

          <ChatInput agentName={agent.name} />
        </div>
      </aside>

      {/* Right Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section className="space-y-3">
          <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="text-muted-foreground h-4 w-4" />
            Recent activity
          </h2>
          <ActivityHeatmap data={heatmapData} />
        </section>

        {hasRuns ? (
          <>
            <ConnectionIndicators />
            <RunHistory runs={recentRuns} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <RunHistory runs={recentRuns} />
          </div>
        )}
      </div>

      {/* Share feedback */}
      <div className="pointer-events-none fixed right-6 bottom-6 z-50">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 pointer-events-auto h-9 rounded-full px-4 text-xs font-medium shadow-sm">
          <MessageSquare className="mr-2 h-4 w-4" />
          Share agent feedback
        </Button>
      </div>
    </div>
  )
}
