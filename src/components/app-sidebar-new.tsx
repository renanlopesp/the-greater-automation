'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Bot, LayoutGrid, Clock, Zap } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { UsageData, PlanData } from '@/types/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import BoringAvatar from 'boring-avatars'
import { getAgentPalette } from '@/lib/agent-palettes'
import { cn } from '@/lib/utils'

interface InstalledAgent {
  id: string
  name: string
  palette: string | null
  avatar_url: string | null
  status: string | null
}

interface AppSidebarNewProps {
  collapsed: boolean
  onToggleCollapse: () => void
  usage?: UsageData | null
  planData?: PlanData | null
  orchestratorId?: string | null
  teamName?: string | null
}

export default function AppSidebarNew({
  collapsed,
  usage,
  planData,
  orchestratorId,
  teamName,
}: AppSidebarNewProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [installedAgents, setInstalledAgents] = useState<InstalledAgent[]>([])

  const navItems = [
    { labelKey: 'nav.home', icon: Home, path: '/dashboard' },
    {
      labelKey: 'nav.newChat',
      icon: Plus,
      path: orchestratorId ? `/agents/${orchestratorId}` : '/chat',
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

  // Load installed (module-based) agents
  useEffect(() => {
    async function loadInstalledAgents() {
      try {
        const supabase = createBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // Get team for this user
        const { data: memberRow } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        if (!memberRow?.team_id) return

        const { data: agents } = await supabase
          .from('agents')
          .select('id, name, palette, avatar_url, status')
          .eq('team_id', memberRow.team_id)
          .not('agent_type', 'is', null)
          .order('name')

        if (agents) {
          setInstalledAgents(
            agents.map((a) => ({
              id: a.id,
              name: a.name,
              palette: a.palette ?? null,
              avatar_url: (a as Record<string, unknown>).avatar_url as string | null,
              status: (a as Record<string, unknown>).status as string | null,
            }))
          )
        }
      } catch {
        // Silently fail — sidebar agent list is non-critical
      }
    }

    loadInstalledAgents()
  }, [])

  return (
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
          <Link
            key={item.path}
            href={item.path}
            title={collapsed ? t(item.labelKey) : undefined}
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
              <span className="flex-1 text-left text-sm whitespace-nowrap">{t(item.labelKey)}</span>
            </div>
          </Link>
        ))}

        {/* Installed agents section */}
        {installedAgents.length > 0 && (
          <div className="mt-4">
            {!collapsed && (
              <p className="text-muted-foreground mb-1 px-3 text-[11px] font-medium tracking-wide uppercase">
                Co-workers
              </p>
            )}
            {installedAgents.map((agent) => {
              const agentPath = `/agents/${agent.id}`
              const active = pathname === agentPath
              const isRunning = agent.status === 'running'
              return (
                <Link
                  key={agent.id}
                  href={agentPath}
                  title={collapsed ? agent.name : undefined}
                  className={cn(
                    'relative mb-0.5 flex w-full items-center gap-2.5 overflow-hidden rounded-md px-3 py-1.5 transition-colors',
                    active
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {/* Avatar with optional running dot */}
                  <div className="relative shrink-0">
                    <BoringAvatar
                      name={agent.name}
                      variant="bauhaus"
                      size={28}
                      colors={getAgentPalette(agent.palette ?? 'blue')}
                    />
                    {isRunning && (
                      <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-white bg-green-500" />
                    )}
                  </div>

                  <div
                    className={`flex min-w-0 flex-1 items-center overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out ${
                      collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
                    }`}
                  >
                    <span className="flex-1 truncate text-left text-sm">{agent.name}</span>
                  </div>
                </Link>
              )
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
  )
}
