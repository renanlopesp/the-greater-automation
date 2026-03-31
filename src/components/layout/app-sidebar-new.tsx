'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Cpu, AppWindow, ClipboardList, Zap, Settings } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SidebarSkillPills } from '@/components/layout/sidebar-skill-pills'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'New Task', icon: Plus, path: '/dashboard' },
  { label: 'Tarefas', icon: ClipboardList, path: '/tarefas' },
  { label: 'Skills', icon: Cpu, path: '/skills' },
  { label: 'Apps', icon: AppWindow, path: '/apps' },
] as const

interface AppSidebarNewProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onClose?: () => void
}

function isActive(pathname: string, path: string): boolean {
  if (path === '/dashboard') return pathname === '/' || pathname === '/dashboard'
  if (path === '/chat') return pathname === '/chat'
  if (path === '/skills') return pathname === '/skills' || pathname.startsWith('/skills/')
  if (path === '/tarefas') return pathname === '/tarefas' || pathname.startsWith('/tarefas/')
  if (path === '/apps') return pathname === '/apps' || pathname.startsWith('/apps/')
  return pathname.startsWith(path)
}

export function AppSidebarNew({ collapsed, onToggleCollapse, onClose }: AppSidebarNewProps) {
  const pathname = usePathname()

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
          className={cn(
            'group flex h-[48px] shrink-0 cursor-pointer items-center select-none',
            collapsed ? 'justify-center px-3' : 'px-4'
          )}
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <div className="relative h-6 w-6">
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
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="bg-foreground text-background flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                <svg width="14" height="9" viewBox="0 0 535 323" fill="currentColor">
                  <path d="M400.165 220.285L354.779 323H0L94.3887 143.841L400.165 220.285Z" />
                  <path d="M446.979 159.642L131.339 158.637L217.867 0H534.057L446.979 159.642Z" />
                </svg>
              </div>
              <span className="text-foreground flex-1 text-sm font-medium whitespace-nowrap">
                Snew
              </span>
              <div className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
          )}
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            'flex flex-col pt-3 pb-1 transition-[padding] duration-300',
            collapsed ? 'px-1.5' : 'px-2'
          )}
          style={{ flex: '1 1 0', overflowY: 'auto' }}
        >
          {navItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.path}
                  onClick={onClose}
                  className={cn(
                    'relative mb-0.5 flex w-full items-center rounded-md transition-colors',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
                    isActive(pathname, item.path)
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <div
                    className={cn(
                      'flex min-w-0 flex-1 items-center overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out',
                      collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
                    )}
                  >
                    <span className="flex-1 text-left text-[13px] whitespace-nowrap">
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
          ))}
        </nav>

        {/* Skill pills footer */}
        <SidebarSkillPills collapsed={collapsed} onClose={onClose} />

        {/* Credits + Settings section */}
        <div
          className={cn(
            'border-border shrink-0 border-t p-3',
            collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'
          )}
        >
          {/* Credits — expanded */}
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

          {/* Credits — collapsed (Zap icon only) */}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="border-border hover:bg-accent flex h-8 w-8 items-center justify-center rounded-md border transition-colors">
                  <Zap className="text-muted-foreground h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={8}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
              >
                847 credits remaining
              </TooltipContent>
            </Tooltip>
          )}

          {/* Settings button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'border-border hover:bg-accent flex h-8 items-center justify-center rounded-md border transition-colors',
                  collapsed ? 'w-8' : 'w-full'
                )}
              >
                <Settings className="text-muted-foreground h-4 w-4" />
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent
                side="right"
                sideOffset={8}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
              >
                Settings
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
