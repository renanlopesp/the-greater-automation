import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: 'draft' | 'published'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return status === 'draft' ? (
    <Badge variant="secondary">Draft</Badge>
  ) : (
    <Badge variant="default">Published</Badge>
  )
}
