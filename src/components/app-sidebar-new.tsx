'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Bot, LayoutGrid, Clock, Zap } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { UsageData, PlanData } from '@/types/navigation'
import CoworkerAvatar from '@/components/coworker-avatar'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const AGENT_TYPE_AVATAR_MAP: Record<string, string> = {
  'carrinho-conversao': 'abandoned-cart',
}

interface AppSidebarNewProps {
  collapsed: boolean
  onToggleCollapse: () => void
  usage?: UsageData | null
  planData?: PlanData | null
  orchestratorId?: string | null
  installedAgents?: Array<{
    id: string
    name: string
    agentType: string | null
    status: string | null
  }>
  teamName?: string | null
}

export default function AppSidebarNew({
  collapsed,
  usage,
  planData,
  orchestratorId,
  installedAgents = [],
  teamName,
}: AppSidebarNewProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { avatars } = useCoworkerAvatars()
  const navItems = [
    { labelKey: 'nav.home', icon: Home, path: '/dashboard' },
    {
      labelKey: 'nav.newChat',
      icon: Plus,
      path: '/chat',
    },
    { labelKey: 'nav.coworkers', icon: Bot, path: '/agents' },
    { labelKey: 'nav.apps', icon: LayoutGrid, path: '/apps' },
    { labelKey: 'nav.history', icon: Clock, path: '/history' },
  ] as const

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    if (path === '/chat') return pathname === '/chat'
    if (path.startsWith('/agents/')) return pathname === path
    if (path === '/agents') return pathname === '/agents' || pathname.startsWith('/agents/')
    if (path === '/history') return pathname === '/history' || pathname.startsWith('/chat/')
    return pathname.startsWith(path)
  }

  const creditsRemaining = usage ? Math.max(0, usage.aiCreditsLimit - usage.aiCreditsUsed) : null

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="border-border bg-sidebar relative flex h-screen flex-col overflow-visible border-r transition-[width] duration-300 ease-in-out"
        style={{ width: collapsed ? 56 : 240 }}
      >
        {/* Logo / Brand area */}
        <div className="flex h-[48px] shrink-0 items-center overflow-hidden px-2">
          <div className="flex w-full items-center gap-2.5 overflow-hidden px-2">
            <div className="bg-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md p-[5px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/snew.svg"
                alt="Snew"
                width={14}
                height={14}
                className="invert dark:invert-0"
              />
            </div>
            <span
              className={`text-foreground overflow-hidden text-sm font-semibold whitespace-nowrap transition-[opacity,max-width] duration-300 ease-in-out ${
                collapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
              }`}
            >
              Snew
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col overflow-y-auto px-2 pt-3 pb-1" style={{ flex: '1 1 0' }}>
          {navItems.map((item) => (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Link
                  href={item.path}
                  className={`relative mb-0.5 flex w-full items-center gap-2.5 overflow-hidden rounded-md px-3 py-2 transition-colors ${
                    isActive(item.path)
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <div
                    className={`flex min-w-0 flex-1 items-center overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out ${
                      collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
                    }`}
                  >
                    <span className="flex-1 text-left text-sm whitespace-nowrap">
                      {t(item.labelKey)}
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
                  {t(item.labelKey)}
                </TooltipContent>
              )}
            </Tooltip>
          ))}

          {/* Installed agents — matches prototype: border-t, "ativos" label, 20px avatar with dot */}
          {installedAgents.length > 0 && (
            <div
              className={cn(
                'border-border flex flex-col border-t pt-3 pb-2',
                collapsed ? 'items-center gap-1 px-1.5' : 'gap-1 px-2.5'
              )}
            >
              {!collapsed && (
                <p className="text-muted-foreground/50 mb-1 px-1 text-[10px] font-medium">ativos</p>
              )}
              {installedAgents.map((agent) => {
                const agentPath = `/agents/${agent.id}`
                const active = pathname === agentPath
                const avatarKey =
                  AGENT_TYPE_AVATAR_MAP[agent.agentType ?? ''] ??
                  agent.name.toLowerCase().replace(/\s+/g, '-')
                const agentLink = (
                  <Link
                    href={agentPath}
                    className={cn(
                      'flex w-full items-center rounded-md transition-colors',
                      collapsed ? 'justify-center p-1' : 'gap-2.5 px-2 py-1.5',
                      active ? 'bg-accent' : 'hover:bg-accent/60'
                    )}
                  >
                    <div className="relative shrink-0">
                      <CoworkerAvatar
                        src={avatars[avatarKey]}
                        name={agent.name}
                        size="xs"
                        className={cn(
                          collapsed ? '!h-6 !w-6' : '!h-5 !w-5',
                          'ring-1 transition-all',
                          active ? 'ring-foreground/30' : 'ring-border'
                        )}
                      />
                      <span className="bg-foreground/40 ring-background absolute right-0 bottom-0 h-2 w-2 animate-pulse rounded-full ring-1" />
                    </div>
                    <div
                      className={`min-w-0 flex-1 overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out ${
                        collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
                      }`}
                    >
                      <span className="text-foreground/80 block truncate text-left text-[12px]">
                        {agent.name}
                      </span>
                    </div>
                  </Link>
                )
                if (collapsed) {
                  return (
                    <Tooltip key={agent.id}>
                      <TooltipTrigger asChild>{agentLink}</TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={8}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
                      >
                        {agent.name}
                      </TooltipContent>
                    </Tooltip>
                  )
                }
                return <span key={agent.id}>{agentLink}</span>
              })}
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div
          className={`border-border border-t p-3 transition-all duration-300 ${
            collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'
          }`}
        >
          <div
            className={`w-full overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out ${
              collapsed ? 'pointer-events-none max-h-0 opacity-0' : 'max-h-24 opacity-100'
            }`}
          >
            <div className="mb-2 flex items-center gap-2 px-2">
              <Zap className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {creditsRemaining !== null
                  ? t('credits.remaining', { count: creditsRemaining })
                  : t('credits.remaining', { count: 0 })}
              </span>
            </div>
            {planData?.planId === 'free' && (
              <button className="border-border text-foreground hover:bg-accent w-full rounded-md border px-3 py-1.5 text-sm transition-colors">
                {t('credits.upgrade')}
              </button>
            )}
          </div>

          {collapsed && (
            <button
              title={t('credits.upgrade')}
              className="border-border hover:bg-accent flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
            >
              <Zap className="text-muted-foreground h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
