import { formatDistanceToNow, differenceInDays, format } from 'date-fns'

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'

  const date = new Date(dateStr)
  const daysDiff = differenceInDays(new Date(), date)

  if (daysDiff < 7) {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  return format(date, 'MMM d, yyyy')
}
