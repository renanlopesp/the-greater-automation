'use client'

import { useState } from 'react'
import { Folder, Bell, Settings, LogOut, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createBrowserClient } from '@/lib/supabase/client'

interface TopBarProps {
  userInitials?: string
  userName?: string
  userEmail?: string
  className?: string
  onOpenSettings?: () => void
}

export function TopBar({
  userInitials = '?',
  userName,
  userEmail,
  className,
  onOpenSettings,
}: TopBarProps) {
  const [, setNotifOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

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

      {/* User avatar with dropdown */}
      <div className="relative ml-1">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              className="bg-muted text-foreground hover:ring-border flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all hover:ring-2"
              aria-label="User menu"
            >
              {userInitials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="end">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              {userName && <span className="truncate font-semibold">{userName}</span>}
              {userEmail && (
                <span className="text-muted-foreground truncate text-xs font-normal">
                  {userEmail}
                </span>
              )}
              {!userName && !userEmail && <span className="font-semibold">Minha conta</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onOpenSettings?.()}>
              <Settings className="mr-2 size-4" />
              Configurações da conta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? (
                <Sun className="mr-2 size-4" />
              ) : (
                <Moon className="mr-2 size-4" />
              )}
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
