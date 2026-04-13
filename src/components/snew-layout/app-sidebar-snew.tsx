'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import {
  Home,
  Cpu,
  ClipboardList,
  AppWindow,
  LayoutGrid,
  Zap,
  Settings,
  Sun,
  Moon,
  LogOut,
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

/**
 * Snew floating sidebar. Ported 1:1 from snew-ai-core AppSidebar.tsx
 * with the Snew-specific footer (credits + user dropdown) added.
 *
 * - 68px collapsed / 252px expanded (12px padding around floating panel)
 * - White floating panel, 8px radius, subtle shadow
 * - Persists collapse state in localStorage['sidebar_collapsed']
 * - Radix Tooltip (right-aligned) when collapsed
 * - Footer: credits counter + user menu dropdown
 */

interface NavItem {
  label: string
  icon: typeof Home
  path: string
  board?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'Board', icon: LayoutGrid, path: '/studio/create', board: true },
  { label: 'Skills', icon: Cpu, path: '/skills' },
  { label: 'Tarefas', icon: ClipboardList, path: '/tarefas' },
  { label: 'Apps', icon: AppWindow, path: '/apps' },
]

interface AppSidebarSnewProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onClose?: () => void
  onOpenSettings?: () => void
  userInitials?: string
  userName?: string
  userEmail?: string
}

export function AppSidebarSnew({
  collapsed,
  onToggleCollapse,
  onClose,
  onOpenSettings,
  userInitials = '?',
  userName,
  userEmail,
}: AppSidebarSnewProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()

  const isActive = (item: NavItem): boolean => {
    if (item.board) return false
    if (item.path === '/dashboard') return pathname === '/' || pathname === '/dashboard'
    if (item.path === '/skills') return pathname === '/skills' || pathname.startsWith('/skills/')
    if (item.path === '/tarefas') return pathname === '/tarefas' || pathname.startsWith('/tarefas/')
    if (item.path === '/apps') return pathname === '/apps' || pathname.startsWith('/apps/')
    return pathname.startsWith(item.path)
  }

  const handleNav = (item: NavItem) => {
    router.push(item.path)
    onClose?.()
  }

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        suppressHydrationWarning
        style={{
          padding: '12px 0 12px 12px',
          boxSizing: 'border-box',
          flexShrink: 0,
          height: '100vh',
        }}
        className={cn(
          'transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-[252px]'
        )}
      >
        <aside
          style={{
            background: '#FFFFFF',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          className="dark:bg-card"
        >
          {/* Logo row */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'group flex h-[48px] shrink-0 cursor-pointer items-center select-none',
              collapsed ? 'justify-center px-3' : 'px-4'
            )}
          >
            {collapsed ? (
              <div className="relative h-6 w-6">
                <div className="bg-foreground text-background absolute inset-0 flex items-center justify-center rounded-md text-[11px] font-medium transition-opacity duration-150 group-hover:opacity-0">
                  S
                </div>
                <div className="text-muted-foreground absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <SidebarToggleIcon />
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="text-foreground flex-1 text-left text-sm font-medium whitespace-nowrap">
                  Snew
                </span>
                <div className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <SidebarToggleIcon />
                </div>
              </div>
            )}
          </button>

          {/* Navigation */}
          <nav
            className={cn(
              'flex-1 pt-3 pb-1 transition-[padding] duration-300',
              collapsed ? 'px-1.5' : 'px-2'
            )}
          >
            {NAV_ITEMS.map((item) => {
              const active = hydrated && isActive(item)
              const Icon = item.icon
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.path}
                      prefetch
                      onClick={(e) => {
                        e.preventDefault()
                        handleNav(item)
                      }}
                      className={cn(
                        'relative mb-0.5 flex w-full items-center rounded-md transition-colors',
                        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
                        active
                          ? 'bg-accent text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div
                        className={cn(
                          'flex min-w-0 flex-1 items-center overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out',
                          collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
                        )}
                      >
                        <span
                          className="flex-1 text-left whitespace-nowrap"
                          style={{ fontSize: 13, fontWeight: 400 }}
                        >
                          {item.label}
                        </span>
                      </div>
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
              )
            })}
          </nav>

          {/* Footer: credits + user dropdown */}
          <div
            className={cn(
              'border-border shrink-0 space-y-2 border-t py-3',
              collapsed ? 'px-1.5' : 'px-[14px]'
            )}
          >
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
              <button
                type="button"
                className="border-border text-foreground hover:bg-accent w-full rounded-md border px-3 py-1.5 text-sm transition-colors"
              >
                Upgrade
              </button>
            </div>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'hover:bg-accent flex w-full items-center rounded-md py-1.5 transition-colors',
                    collapsed ? 'justify-center' : 'px-2'
                  )}
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
                  {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleSignOut()}>
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      </div>
    </TooltipProvider>
  )
}

function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

function SidebarToggleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )
}
