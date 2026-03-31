'use client'

import { ChatContextProvider } from '@/contexts/chat-context'
import ChatHeader from '@/components/chat/chat-header'
import ChatLayout from '@/components/chat/chat-layout'
import ArtifactPanelShell from '@/components/chat/artifact-panel-shell'
import OrchestratorChatWrapper from '@/components/chat/orchestrator-chat-wrapper'
import { useTask } from '@/hooks/use-task'
import { MoreHorizontal, Sparkles } from 'lucide-react'

interface TaskData {
  id: string
  title: string
  status: string
  active_skill: string | null
  skill_status: string | null
  artifact_type: string | null
  artifact_data: unknown
  conversation_id: string | null
}

interface TaskPageClientProps {
  task: TaskData
  initialConversationId: string | null
  initialMessages: Array<{ id: string; role: string; content: string }>
}

function ArtifactEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--foreground) 6%, transparent)' }}
      >
        <Sparkles className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
      </div>
      <p className="font-medium" style={{ fontSize: 14, color: 'var(--foreground)' }}>
        Nenhum resultado ainda
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4, maxWidth: 280 }}>
        Converse com o Snew e os resultados de skills aparecem aqui.
      </p>
    </div>
  )
}

function ArtifactLoadingState({ skillName }: { skillName: string | null }) {
  return (
    <ArtifactPanelShell loading>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
        {skillName ? `Gerando ${skillName}...` : 'Processando...'}
      </p>
    </ArtifactPanelShell>
  )
}

function ArtifactErrorState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <p className="font-medium" style={{ fontSize: 14, color: 'var(--destructive)' }}>
        Erro ao gerar resultado
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4, maxWidth: 280 }}>
        Tente novamente na conversa.
      </p>
    </div>
  )
}

function TaskContentWithLayout({
  task: initialTask,
  initialConversationId,
  initialMessages,
}: TaskPageClientProps) {
  // Poll task for artifact updates
  const { data: liveTask } = useTask(initialTask.id)
  const task = liveTask ?? initialTask

  const chatContent = (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        <OrchestratorChatWrapper
          initialConversationId={initialConversationId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  )

  let artifactInner: React.ReactNode
  if (task.skill_status === 'running') {
    artifactInner = <ArtifactLoadingState skillName={task.active_skill} />
  } else if (task.skill_status === 'failed') {
    artifactInner = <ArtifactErrorState />
  } else if (task.skill_status === 'completed' && task.artifact_data) {
    // Phase 2 will wire real ArtifactRenderer here
    artifactInner = (
      <ArtifactPanelShell>
        <pre
          className="overflow-x-auto text-xs"
          style={{ color: 'var(--foreground)', whiteSpace: 'pre-wrap' }}
        >
          {JSON.stringify(task.artifact_data, null, 2)}
        </pre>
      </ArtifactPanelShell>
    )
  } else {
    artifactInner = <ArtifactEmptyState />
  }

  const artifactContent = (
    <div className="flex h-full flex-col">
      {/* Artifact top bar -- aligned with chat header height */}
      <div className="flex shrink-0 items-center justify-end px-4" style={{ height: 48 }}>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground hover:bg-background/50 flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">{artifactInner}</div>
    </div>
  )

  return <ChatLayout chatContent={chatContent} artifactContent={artifactContent} />
}

export default function TaskPageClient(props: TaskPageClientProps) {
  return (
    <ChatContextProvider>
      <TaskContentWithLayout {...props} />
    </ChatContextProvider>
  )
}
