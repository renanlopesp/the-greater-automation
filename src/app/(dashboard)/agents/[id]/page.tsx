import { notFound, redirect } from 'next/navigation'
import { subMonths, format } from 'date-fns'
import { createServerClient } from '@/lib/supabase/server'
import { ScrollArea } from '@/components/ui/scroll-area'
import AgentAvatar from '@/components/agent-detail/agent-avatar'
import AgentInfo from '@/components/agent-detail/agent-info'
import SkillsList from '@/components/agent-detail/skills-list'
import ChatInput from '@/components/agent-detail/chat-input'
import ActivityHeatmap from '@/components/agent-detail/activity-heatmap'
import ProgressIndicators from '@/components/agent-detail/progress-indicators'
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

  const [skillsResult, runsResult, recentRunsResult, usageResult] = await Promise.all([
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

    // Usage for progress indicators
    supabase
      .from('usage')
      .select('steps_used, steps_limit, ai_credits_used, ai_credits_limit')
      .eq('team_id', agent.team_id)
      .order('period_start', { ascending: false })
      .limit(1)
      .single(),
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

  const usage = usageResult.data

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Left Panel */}
      <div className="bg-agent-panel flex w-full flex-col border-b md:w-96 md:border-r md:border-b-0">
        <div className="flex flex-col items-center gap-4 p-6">
          <AgentAvatar />
          <AgentInfo name={agent.name} description={agent.description} />
        </div>
        <ScrollArea className="flex-1 px-6">
          <SkillsList skills={skills} agentId={id} />
        </ScrollArea>
        <ChatInput agentName={agent.name} />
      </div>

      {/* Right Panel */}
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <ActivityHeatmap data={heatmapData} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Usage</h2>
          <ProgressIndicators
            stepsUsed={usage?.steps_used ?? 0}
            stepsLimit={usage?.steps_limit ?? 1000}
            aiCreditsUsed={Number(usage?.ai_credits_used ?? 0)}
            aiCreditsLimit={Number(usage?.ai_credits_limit ?? 100)}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Run history</h2>
          <RunHistory runs={recentRuns} />
        </section>
      </div>
    </div>
  )
}
