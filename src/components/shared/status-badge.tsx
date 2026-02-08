import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: 'draft' | 'published'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'draft') {
    return <Badge variant="secondary">Draft</Badge>
  }

  return (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
      Published
    </Badge>
  )
}
