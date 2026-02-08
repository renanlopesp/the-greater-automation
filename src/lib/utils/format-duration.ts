import { differenceInSeconds } from 'date-fns'

export function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '--'

  const seconds = differenceInSeconds(new Date(completedAt), new Date(startedAt))

  if (seconds < 1) return '< 1s'

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) return `${remainingSeconds}s`
  return `${minutes}m ${remainingSeconds}s`
}
