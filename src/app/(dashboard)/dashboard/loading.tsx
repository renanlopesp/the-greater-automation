import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Search */}
      <Skeleton className="h-12 w-full max-w-lg rounded-xl" />
      {/* Quick actions */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-10 w-48 rounded-full" />
      </div>
      {/* Activity + Skills grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
