'use client'

import { useState } from 'react'
import { Folder, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  userInitials?: string
  className?: string
}

export function TopBar({ userInitials = '?', className }: TopBarProps) {
  const [, setNotifOpen] = useState(false)

  return (
    <header
      className={cn(
        'border-border bg-background flex h-[48px] shrink-0 items-center gap-1 border-b px-4',
        className
      )}
    >
      <div className="flex-1" />

      {/* Feedback + Support */}
      <button className="border-border text-muted-foreground hover:border-foreground/40 h-7 rounded-lg border bg-transparent px-2.5 text-[11px] transition-colors">
        Feedback
      </button>
      <button className="border-border text-muted-foreground hover:border-foreground/40 h-7 rounded-lg border bg-transparent px-2.5 text-[11px] transition-colors">
        Support
      </button>

      <div className="bg-border mx-1 h-5 w-px" />

      {/* Folder */}
      <button className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
        <Folder className="h-4 w-4" />
      </button>

      {/* Bell with notification dot */}
      <button
        onClick={() => setNotifOpen((o) => !o)}
        className="text-muted-foreground hover:bg-accent hover:text-foreground relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        <span className="bg-foreground absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" />
      </button>

      {/* User avatar */}
      <div className="relative ml-1">
        <button
          className="bg-muted text-foreground hover:ring-border flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all hover:ring-2"
          aria-label="User menu"
        >
          {userInitials}
        </button>
      </div>
    </header>
  )
}
