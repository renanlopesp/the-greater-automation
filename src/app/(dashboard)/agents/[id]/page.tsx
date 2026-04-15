import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveConversation } from '@/lib/queries/agent-conversations'
import ChatPanel from '@/components/agent-detail/chat-panel'
import SetupChecklist, { type SetupStep } from '@/components/agent-detail/setup-checklist'
import AgentWorkspacePanel from '@/components/agent-detail/agent-workspace-panel'
import InstalledAgentPage from '@/components/agent-detail/installed-agent-page'

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { id } = await params
  const { q: initialQuery } = await searchParams
  const supabase = await createServerClient()

  // Parallel: auth + agent + profile + conversation — no dependency between them
  const [
    {
      data: { user },
    },
    { data: agent },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('agents')
      .select(
        'id, name, team_id, system_prompt, model, temperature, max_tokens, is_orchestrator, palette, description, status, is_active, created_by, avatar_url, avatar_type, conversation_starters, created_at, updated_at'
      )
      .eq('id', id)
      .single(),
  ])

  if (!user) redirect('/login')
  if (!agent) notFound()

  // Parallel: profile + conversation history + team role + setup data (all depend on user/agent being resolved)
  const [
    activeConversation,
    { data: storeData },
    { data: messagingLink },
    { count: skillCount },
    { data: teamAgents },
  ] = await Promise.all([
    getActiveConversation(supabase, id, user.id),
    supabase
      .from('stores')
      .select('id, platform, platform_store_id, platform_access_token, settings')
      .eq('team_id', agent.team_id)
      .single(),
    supabase.from('messaging_links').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
    supabase.from('agent_skills').select('id', { count: 'exact', head: true }).eq('agent_id', id),
    supabase
      .from('agents')
      .select('id, name')
      .eq('team_id', agent.team_id)
      .eq('is_active', true)
      .neq('is_orchestrator', true)
      .order('name'),
  ])

  // Orchestrator agents skip setup checklist and get tailored conversation starters
  const isOrchestrator = agent.is_orchestrator

  // Build setup checklist based on agent role (skip for orchestrator)
  const setupSteps = isOrchestrator
    ? []
    : buildSetupSteps(agent, storeData, messagingLink, skillCount ?? 0, 0)

  // Orchestrator conversation starters
  const orchestratorStarters = [
    'Como está meu estoque?',
    'Vendas de hoje',
    'Previsão de demanda',
    'Pedidos recentes',
  ]

  const conversationStarters = isOrchestrator
    ? orchestratorStarters
    : Array.isArray(agent.conversation_starters)
      ? (agent.conversation_starters as string[])
      : []

  // Orchestrator agents keep the full-width chat layout (no workspace panel)
  if (isOrchestrator) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        <ChatPanel
          agentId={id}
          agentName={agent.name}
          agentPalette={agent.palette}
          conversationStarters={conversationStarters}
          coworkers={(teamAgents ?? []).map((a) => ({ id: a.id, name: a.name }))}
          currentUserId={user.id}
          initialConversationId={activeConversation?.conversationId ?? null}
          initialMessages={activeConversation?.messages ?? []}
          initialQuery={initialQuery}
        />
      </div>
    )
  }

  // Module-based agents (agent_type is set) get the installed agent page layout
  const agentType = (agent as Record<string, unknown>).agent_type as string | null | undefined
  if (agentType) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <InstalledAgentPage
          agentId={id}
          agentName={agent.name}
          agentDescription={agent.description}
          agentType={agentType}
          agentPalette={agent.palette}
          teamId={agent.team_id}
          currentUserId={user.id}
          storeConnected={
            storeData?.platform === 'manual' ||
            (!!storeData?.platform_store_id && !!storeData?.platform_access_token)
          }
          initialConversationId={activeConversation?.conversationId ?? null}
          initialMessages={activeConversation?.messages ?? []}
        />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left panel — Chat */}
      <div className="border-border flex w-[440px] shrink-0 flex-col border-r">
        {/* Setup checklist */}
        {setupSteps.length > 0 && <SetupChecklist agentName={agent.name} steps={setupSteps} />}

        <ChatPanel
          agentId={id}
          agentName={agent.name}
          agentPalette={agent.palette}
          conversationStarters={conversationStarters}
          coworkers={(teamAgents ?? []).map((a) => ({ id: a.id, name: a.name }))}
          currentUserId={user.id}
          initialConversationId={activeConversation?.conversationId ?? null}
          initialMessages={activeConversation?.messages ?? []}
          initialQuery={initialQuery}
        />
      </div>

      {/* Right panel — Workspace tabs */}
      <div className="flex-1">
        <AgentWorkspacePanel
          agentId={id}
          agentName={agent.name}
          category={agent.description ?? undefined}
        />
      </div>
    </div>
  )
}

/**
 * Builds setup checklist steps based on the agent's system_prompt (which encodes role)
 * and the current store/messaging configuration.
 */
function buildSetupSteps(
  agent: { name: string; system_prompt: string | null },
  storeData: {
    platform: string | null
    platform_store_id: string | null
    settings: unknown
  } | null,
  messagingLink: { id: string } | null,
  skillCount: number,
  workflowCount: number
): SetupStep[] {
  // "manual" platform means no online store — nothing to connect
  const hasPlatform = storeData?.platform === 'manual' || !!storeData?.platform_store_id
  const hasTelegram = !!messagingLink
  const settings = (
    typeof storeData?.settings === 'object' && storeData?.settings !== null
      ? storeData.settings
      : {}
  ) as Record<string, unknown>

  const connectPlatform: SetupStep = {
    label: 'Conectar plataforma de e-commerce',
    completed: hasPlatform,
    action: { label: 'Conectar', href: '/workspace?settings=store' },
  }
  const connectTelegram: SetupStep = {
    label: 'Conectar Telegram',
    completed: hasTelegram,
    action: { label: 'Conectar', href: '/workspace?settings=store' },
  }

  // Determine role from agent name (set during provisioning)
  const name = agent.name.toLowerCase()

  if (name.includes('stock manager')) {
    const steps = [
      connectPlatform,
      {
        label: 'Definir limite de alerta de estoque',
        completed: !!settings.stock_alerts_configured || hasPlatform,
        action: { label: 'Configurar', href: '/workspace?settings=store' },
      },
      connectTelegram,
    ]
    return steps.some((s) => !s.completed) ? steps : []
  }

  if (name.includes('price monitor')) {
    const steps = [
      connectPlatform,
      {
        label: 'Adicionar URLs de concorrentes para monitorar',
        completed: workflowCount >= 1,
      },
      connectTelegram,
    ]
    return steps.some((s) => !s.completed) ? steps : []
  }

  if (name.includes('sales analyst')) {
    const steps = [
      connectPlatform,
      connectTelegram,
      {
        label: 'Configurar horário do resumo diário',
        completed: !!settings.daily_summary_enabled,
        action: { label: 'Configurar', href: '/workspace?settings=store' },
      },
    ]
    return steps.some((s) => !s.completed) ? steps : []
  }

  if (name.includes('customer service')) {
    const steps = [
      connectPlatform,
      {
        label: 'Adicionar FAQ ou conteúdo de conhecimento',
        completed: skillCount >= 2,
      },
      connectTelegram,
    ]
    return steps.some((s) => !s.completed) ? steps : []
  }

  // Non-retail agents or unknown roles — no checklist
  return []
}
