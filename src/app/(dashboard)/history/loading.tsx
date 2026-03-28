import { Skeleton } from '@/components/ui/skeleton'

export default function HistoryLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
