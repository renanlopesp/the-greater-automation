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
 * Polls every 2s when skill is running, 5s when idle, stops otherwise (catches artifact updates from chat tools).
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
    select: (data) => data.task,
    refetchInterval: (query) => {
      const task = query.state.data?.task
      if (!task) return 2000
      if (task.skill_status === 'running') return 2000
      if (task.skill_status === 'completed' && task.artifact_data) return false
      if (task.skill_status === 'failed') return false
      // Keep polling while waiting for skill to start or artifact to appear
      return 3000
    },
    retry: 3,
  })
}
