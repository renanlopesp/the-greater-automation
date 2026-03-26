export default function DashboardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        style={{ color: 'var(--muted-foreground)' }}
      />
    </div>
  )
}
