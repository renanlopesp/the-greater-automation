import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="text-foreground text-6xl font-semibold">404</h1>
      <p className="text-muted-foreground mt-3 text-sm">Page not found</p>
      <Link
        href="/dashboard"
        className="bg-foreground text-background mt-6 rounded-xl px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
      >
        Go home
      </Link>
    </div>
  )
}
