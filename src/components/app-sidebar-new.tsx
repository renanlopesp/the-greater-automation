'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, Bot, LayoutGrid, Clock, Zap } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { UsageData, PlanData } from '@/types/navigation'

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

  return (
    <aside
      className="border-border bg-sidebar relative flex h-screen flex-col overflow-visible border-r transition-[width] duration-300 ease-in-out"
      style={{ width: collapsed ? 56 : 240 }}
    >
      {/* Logo / Brand area */}
      <div
        className={`flex h-[48px] shrink-0 items-center ${
          collapsed ? 'justify-center px-3' : 'px-4'
        }`}
      >
        {collapsed ? (
          <div className="bg-foreground text-background flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold">
            {teamName?.[0]?.toUpperCase() ?? 'S'}
          </div>
        ) : (
          <span className="text-foreground text-sm font-semibold whitespace-nowrap">
            {teamName ?? 'Snew'}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={`flex-1 pt-3 pb-1 transition-[padding] duration-300 ${
          collapsed ? 'px-1.5' : 'px-2'
        }`}
      >
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            title={collapsed ? t(item.labelKey) : undefined}
            className={`relative mb-0.5 flex w-full items-center rounded-md transition-colors ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'
            } ${
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
                ? `${creditsRemaining} créditos restantes`
                : t('credits.remaining')}
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
