import EmptyState from '@/components/shared/empty-state'

export default function RunsEmptyState() {
  return (
    <EmptyState
      icon={
        <div className="relative h-[100px] w-[120px]">
          <div className="bg-muted absolute top-0 left-2 h-16 w-24 translate-y-0 rounded-lg border" />
          <div className="bg-muted absolute top-2 left-1 h-16 w-[104px] translate-y-1 rounded-lg border" />
          <div className="bg-background absolute top-4 left-0 h-16 w-28 translate-y-2 rounded-lg border" />
        </div>
      }
      title="No runs yet"
      description="Run a workflow to see execution history here."
      action={{ label: 'View workflows', href: '/workspace' }}
    />
  )
}
