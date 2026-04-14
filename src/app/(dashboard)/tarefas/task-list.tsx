'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, MessageSquare, Sparkles, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  status: string
  active_skill: string | null
  skill_status: string | null
  created_at: string
}

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch('/api/tasks')
  if (!res.ok) return []
  const data = await res.json()
  return data.tasks ?? []
}

async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete')
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function TaskList() {
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  })

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onMutate: (taskId) => {
      setDeletingId(taskId)
    },
    onSuccess: (_data, taskId) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        (old ?? []).filter((t) => t.id !== taskId)
      )
      toast.success('Tarefa deletada')
    },
    onError: () => {
      toast.error('Erro ao deletar tarefa')
    },
    onSettled: () => {
      setDeletingId(null)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 pt-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-foreground/[0.03] h-[60px] animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'color-mix(in srgb, var(--foreground) 4%, transparent)' }}
        >
          <MessageSquare className="text-muted-foreground h-5 w-5" />
        </div>
        <p className="text-foreground text-sm font-medium">Nenhuma tarefa ainda</p>
        <p className="text-muted-foreground mt-1 text-[13px]">
          Use o ask bar no dashboard para criar uma.
        </p>
        <Link
          href="/dashboard"
          className="bg-foreground text-background mt-5 rounded-xl px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Ir para o Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      <p className="text-muted-foreground mb-3 text-xs">
        {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
      </p>
      <div className="flex flex-col gap-0.5">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/studio/create/${task.id}`}
            className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-[var(--accent)]"
            style={{
              opacity: deletingId === task.id ? 0.4 : 1,
              pointerEvents: deletingId === task.id ? 'none' : 'auto',
            }}
          >
            {/* Icon */}
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--foreground) 5%, transparent)' }}
            >
              {task.active_skill ? (
                <Sparkles size={14} className="text-muted-foreground" />
              ) : (
                <MessageSquare size={14} className="text-muted-foreground" />
              )}
            </div>

            {/* Title + skill */}
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-[13px] font-medium">{task.title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {task.active_skill ?? 'Conversa'} · {relativeTime(task.created_at)}
              </p>
            </div>

            {/* Status */}
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                background:
                  task.skill_status === 'completed'
                    ? 'color-mix(in srgb, #22c55e 10%, transparent)'
                    : 'color-mix(in srgb, var(--foreground) 5%, transparent)',
                color: task.skill_status === 'completed' ? '#22c55e' : 'var(--muted-foreground)',
              }}
            >
              {task.skill_status === 'completed'
                ? 'Concluída'
                : task.skill_status === 'running'
                  ? 'Gerando...'
                  : 'Ativa'}
            </span>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                deleteMutation.mutate(task.id)
              }}
              disabled={deleteMutation.isPending}
              className="text-muted-foreground/0 group-hover:text-muted-foreground/60 hover:!text-destructive flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all disabled:opacity-50"
              title="Deletar tarefa"
            >
              {deletingId === task.id ? (
                <Loader2 size={14} className="text-muted-foreground animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </Link>
        ))}
      </div>
    </div>
  )
}
