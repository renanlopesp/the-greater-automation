'use client'

import { useQuery } from '@tanstack/react-query'

export interface Task {
  id: string
  title: string
  status: string
  active_skill: string | null
  skill_status: string | null
  artifact_type: string | null
  artifact_data: unknown
  conversation_id: string | null
  initial_message: string | null
  created_at: string
  updated_at: string
}

async function fetchTask(taskId: string): Promise<{ task: Task }> {
  const res = await fetch(`/api/tasks/${taskId}`)
  if (!res.ok) {
    throw new Error('Failed to fetch task')
  }
  return res.json()
}

/**
 * React Query hook for fetching a single task with polling support.
 * Polls every 2s when skill_status is 'running', stops otherwise.
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
    select: (data) => data.task,
    refetchInterval: (query) => {
      const task = query.state.data?.task
      if (!task) return 2000 // poll until first data arrives
      if (task.skill_status === 'running' || task.skill_status === 'idle') return 2000
      return false // stop polling when completed or failed
    },
    retry: 3,
  })
}
