'use client'

import { useState } from 'react'
import { Bell, Settings, LogOut, Sun, Moon, Check } from 'lucide-react'
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
  userTeams?: Array<{ id: string; name: string; role: string }>
  activeTeamId?: string
  className?: string
  onOpenSettings?: () => void
  onSwitchWorkspace?: (teamId: string) => void
}

export function TopBar({
  userInitials = '?',
  userName,
  userEmail,
  userTeams,
  activeTeamId,
  className,
  onOpenSettings,
  onSwitchWorkspace,
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
      className={cn('bg-background flex h-[48px] shrink-0 items-center gap-1 px-4', className)}
    >
      <div className="flex-1" />

      {/* Bell with notification dot */}
      <button
        onClick={() => setNotifOpen((o) => !o)}
        className="text-muted-foreground hover:bg-accent hover:text-foreground relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        <span
          className="absolute top-1.5 right-1.5 rounded-full"
          style={{
            width: 6,
            height: 6,
            background: '#e24b4a',
            boxShadow: '0 0 0 1.5px var(--background)',
          }}
        />
      </button>

      {/* User avatar with dropdown */}
      <div className="relative ml-1">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              className="hover:ring-border flex items-center justify-center rounded-full font-semibold text-white transition-all hover:ring-2"
              style={{
                width: 28,
                height: 28,
                background: 'hsl(217 70% 55%)',
                fontSize: 11,
              }}
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
            {userTeams && userTeams.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                {userTeams.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => userTeams.length > 1 && onSwitchWorkspace?.(t.id)}
                  >
                    <span className="flex-1">{t.name}</span>
                    <span className="text-muted-foreground text-xs capitalize">{t.role}</span>
                    {activeTeamId === t.id && <Check className="ml-2 size-4" />}
                  </DropdownMenuItem>
                ))}
              </>
            )}
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
