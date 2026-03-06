'use client'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

interface GreetingSectionProps {
  userName: string | null
  storeName?: string | null
}

export default function GreetingSection({ userName, storeName }: GreetingSectionProps) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {getGreeting()}, {userName ?? 'there'}
      </h1>
      {storeName && (
        <p className="text-muted-foreground text-base">
          Here&apos;s what Snew identified for{' '}
          <span className="text-foreground font-medium">{storeName}</span> today.
        </p>
      )}
    </div>
  )
}
