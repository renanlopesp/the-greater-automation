import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 pt-24">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="border-t p-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
