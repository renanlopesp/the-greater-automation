import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function WelcomeScreen() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
      <div className="flex w-full flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary flex h-12 w-12 items-center justify-center rounded-md">
            <span className="text-primary-foreground text-lg font-bold">S</span>
          </div>
          <span className="text-foreground text-base font-semibold tracking-tight">Snew</span>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-3">
          <h1 className="text-foreground text-3xl leading-tight font-semibold tracking-tight">
            Your AI-powered CMO
          </h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Connect your store and Snew will analyze your catalog, understand your brand, and start
            working for you.
          </p>
        </div>

        {/* CTA */}
        <div className="flex w-full max-w-md flex-col gap-4">
          <Button asChild className="h-12 w-full rounded-xl text-[14px] font-medium">
            <Link href="/onboarding/connect">Connect your store</Link>
          </Button>
          <p className="text-muted-foreground text-[13px]">
            Already have an account?{' '}
            <Link
              href="/"
              className="text-foreground underline underline-offset-2 transition-opacity hover:opacity-80"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
