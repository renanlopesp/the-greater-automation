import { redirect } from 'next/navigation'
import { Bot } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="bg-muted/50 flex min-h-dvh items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center gap-8 px-4">
        <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <Bot className="text-primary-foreground h-5 w-5" />
        </div>
        {children}
      </div>
    </div>
  )
}
