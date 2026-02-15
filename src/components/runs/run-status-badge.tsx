import { Badge } from '@/components/ui/badge'
import type { Database } from '@/lib/supabase/database.types'

type RunStatus = Database['public']['Enums']['run_status']

interface RunStatusBadgeProps {
  status: RunStatus
}

export default function RunStatusBadge({ status }: RunStatusBadgeProps) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>
    case 'running':
      return (
        <Badge variant="default">
          <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-current" />
          Running
        </Badge>
      )
    case 'completed':
      return <Badge className="bg-chart-2/15 text-chart-2">Completed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'cancelled':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Cancelled
        </Badge>
      )
  }
}
