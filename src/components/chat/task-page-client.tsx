'use client'

// Module-level cache for progress steps (survives artifact_data overwrite)
const stepsCache = new Map<string, ProgressStep[]>()
import { ChatContextProvider } from '@/contexts/chat-context'
import ChatHeader from '@/components/chat/chat-header'
import ChatLayout from '@/components/chat/chat-layout'
import OrchestratorChatWrapper from '@/components/chat/orchestrator-chat-wrapper'
import ArtifactRenderer, {
  ArtifactEmptyState,
  ArtifactLoadingState,
  ArtifactErrorState,
} from '@/components/chat/artifact-renderer'
import { useTask } from '@/hooks/use-task'
import { MoreHorizontal } from 'lucide-react'

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
  initialQuery?: string
}

type ProgressStep = { label: string; done: boolean }

function TaskContentWithLayout({
  task: initialTask,
  initialConversationId,
  initialMessages,
  initialQuery,
}: TaskPageClientProps) {
  // Poll task for artifact updates
  const { data: liveTask } = useTask(initialTask.id)
  const task = liveTask ?? initialTask

  // Cache progress steps so they survive artifact_data overwrite
  if (task.skill_status === 'running' && task.artifact_data) {
    const steps = (task.artifact_data as { steps?: ProgressStep[] })?.steps
    if (steps && steps.length > 0) stepsCache.set(initialTask.id, steps)
  }
  const cachedSteps = stepsCache.get(initialTask.id) ?? []

  // Build skill progress: running shows live steps, completed shows last steps all checked
  let skillProgress: { skillName: string | null; steps: ProgressStep[]; done?: boolean } | undefined
  if (task.skill_status === 'running' && cachedSteps.length > 0) {
    skillProgress = { skillName: task.active_skill, steps: cachedSteps }
  } else if (task.skill_status === 'completed' && task.active_skill && cachedSteps.length > 0) {
    skillProgress = {
      skillName: task.active_skill,
      steps: cachedSteps.map((s) => ({ ...s, done: true })),
      done: true,
    }
  } else if (task.skill_status === 'completed' && task.active_skill) {
    skillProgress = { skillName: task.active_skill, steps: [], done: true }
  }

  const chatContent = (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        <OrchestratorChatWrapper
          initialConversationId={initialConversationId}
          initialMessages={initialMessages}
          initialQuery={initialQuery}
          taskId={initialTask.id}
          skillProgress={skillProgress}
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
    artifactInner = (
      <ArtifactRenderer
        artifactType={task.artifact_type}
        artifactData={task.artifact_data}
        taskId={initialTask.id}
      />
    )
  } else {
    artifactInner = <ArtifactEmptyState />
  }

  const artifactContent = (
    <div className="flex h-full flex-col">
      {/* Artifact top bar -- aligned with chat header height */}
      <div
        className="border-border flex shrink-0 items-center justify-end border-b px-4"
        style={{ height: 48 }}
      >
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
