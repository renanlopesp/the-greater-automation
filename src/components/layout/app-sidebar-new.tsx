'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Plus,
  Cpu,
  AppWindow,
  ClipboardList,
  Palette,
  Zap,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'New Task', icon: Plus, path: '/dashboard' },
  { label: 'Skills', icon: Cpu, path: '/skills' },
  { label: 'Tarefas', icon: ClipboardList, path: '/tarefas' },
  { label: 'Studio', icon: Palette, path: '/studio' },
  { label: 'Apps', icon: AppWindow, path: '/apps' },
] as const

interface AppSidebarNewProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onClose?: () => void
  onOpenSettings?: () => void
  userInitials?: string
  userName?: string
  userEmail?: string
}

function isActive(pathname: string, path: string, label: string): boolean {
  if (label === 'New Task') return false // New Task is a shortcut, never active
  if (path === '/dashboard') return pathname === '/' || pathname === '/dashboard'
  if (path === '/chat') return pathname === '/chat'
  if (path === '/skills') return pathname === '/skills' || pathname.startsWith('/skills/')
  if (path === '/tarefas') return pathname === '/tarefas' || pathname.startsWith('/tarefas/')
  if (path === '/studio') return pathname === '/studio' || pathname.startsWith('/studio/')
  if (path === '/apps') return pathname === '/apps' || pathname.startsWith('/apps/')
  return pathname.startsWith(path)
}

export function AppSidebarNew({
  collapsed,
  onToggleCollapse,
  onClose,
  onOpenSettings,
  userInitials = '?',
  userName,
  userEmail,
}: AppSidebarNewProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'border-border bg-background relative flex h-screen flex-col overflow-visible border-r transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-[56px]' : 'w-[240px]'
        )}
      >
        {/* Logo area */}
        <div
          className="group flex h-[48px] shrink-0 cursor-pointer items-center px-4 select-none"
          onClick={onToggleCollapse}
        >
          <div className="relative h-6 w-6 shrink-0">
            <div className="bg-foreground text-background absolute inset-0 flex items-center justify-center rounded-md transition-opacity duration-150 group-hover:opacity-0">
              <svg width="14" height="9" viewBox="0 0 535 323" fill="currentColor">
                <path d="M400.165 220.285L354.779 323H0L94.3887 143.841L400.165 220.285Z" />
                <path d="M446.979 159.642L131.339 158.637L217.867 0H534.057L446.979 159.642Z" />
              </svg>
            </div>
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </div>
          </div>
          <span
            className={cn(
              'text-foreground overflow-hidden text-sm font-medium whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-in-out',
              collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-2 max-w-[160px] opacity-100'
            )}
          >
            Snew
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col px-2 pt-3 pb-1" style={{ flex: '1 1 0', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.path}
                  onClick={onClose}
                  className={cn(
                    'relative mb-0.5 flex w-full items-center rounded-md px-3 py-2',
                    isActive(pathname, item.path, item.label)
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span
                    className={cn(
                      'overflow-hidden text-left text-[13px] whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-in-out',
                      collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-[160px] opacity-100'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
                >
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </nav>

        {/* Footer section */}
        <div className="border-border shrink-0 space-y-2 border-t px-[14px] py-3">
          {/* Credits */}
          <div
            className={cn(
              'w-full overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out',
              collapsed ? 'pointer-events-none max-h-0 opacity-0' : 'max-h-24 opacity-100'
            )}
          >
            <div className="mb-2 flex items-center gap-2 px-2">
              <Zap className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                847 credits remaining
              </span>
            </div>
            <button className="border-border text-foreground hover:bg-accent w-full rounded-md border px-3 py-1.5 text-sm transition-colors">
              Upgrade
            </button>
          </div>

          {/* User avatar with dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn('hover:bg-accent flex w-full items-center rounded-md py-1.5')}
                aria-label="User menu"
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
                  style={{
                    width: 28,
                    height: 28,
                    background: 'hsl(217 70% 55%)',
                    fontSize: 11,
                  }}
                >
                  {userInitials}
                </div>
                <div
                  className={cn(
                    'flex flex-col overflow-hidden text-left transition-[max-width,opacity,margin] duration-300 ease-in-out',
                    collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-[160px] opacity-100'
                  )}
                >
                  <span className="text-foreground truncate text-[13px] leading-tight font-medium whitespace-nowrap">
                    {userName || 'Minha conta'}
                  </span>
                  {userEmail && (
                    <span className="text-muted-foreground truncate text-[11px] leading-tight whitespace-nowrap">
                      {userEmail}
                    </span>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side={collapsed ? 'right' : 'top'}
              align={collapsed ? 'end' : 'start'}
              sideOffset={8}
            >
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
                Configurações
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
      </aside>
    </TooltipProvider>
  )
}
