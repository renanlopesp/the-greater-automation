'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Cpu, LayoutGrid, Clock } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SidebarSkillPills } from '@/components/layout/sidebar-skill-pills'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'New Chat', icon: Plus, path: '/chat' },
  { label: 'Skills', icon: Cpu, path: '/skills' },
  { label: 'Apps', icon: LayoutGrid, path: '/apps' },
  { label: 'History', icon: Clock, path: '/history' },
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
  if (path === '/history') return pathname === '/history' || pathname.startsWith('/chat/')
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
              <div className="bg-foreground text-background absolute inset-0 flex items-center justify-center rounded-md text-[11px] font-bold transition-opacity duration-150 group-hover:opacity-0">
                S
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
            <Tooltip key={item.path}>
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
      </aside>
    </TooltipProvider>
  )
}
