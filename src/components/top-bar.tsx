'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Folder,
  Bell,
  Check,
  Plus,
  Settings,
  Palette,
  LogOut,
  PanelLeft,
  Globe,
  ChevronDown,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLanguage } from '@/contexts/language-context'
import { createBrowserClient } from '@/lib/supabase/client'
import { switchWorkspaceAction } from '@/lib/actions/workspace'
import type { UserData, PlanData } from '@/types/navigation'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationPanel } from '@/components/notifications/notification-panel'
import { cn } from '@/lib/utils'

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    return fullName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email[0]?.toUpperCase() ?? '?'
}

interface TopBarProps {
  onToggleSidebar: () => void
  onToggleMobileSidebar?: () => void
  sidebarCollapsed: boolean
  user: UserData
  team: { id: string; name: string; slug: string } | null
  userTeams: { id: string; name: string; role: string }[]
  planData?: PlanData | null
  onOpenSettings?: () => void
}

export default function TopBar({
  onToggleSidebar,
  onToggleMobileSidebar,
  sidebarCollapsed,
  user,
  team,
  userTeams,
  planData,
  onOpenSettings,
}: TopBarProps) {
  const { t, language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const router = useRouter()
  const { notifications, unreadCount, hasUrgent, markRead, markAllRead } = useNotifications()

  const initials = getInitials(user.fullName, user.email)

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleSwitchWorkspace(teamId: string) {
    if (team?.id === teamId) return
    setDropdownOpen(false)
    switchWorkspaceAction(teamId).then(() => router.refresh())
  }

  return (
    <header className="border-border bg-background flex h-[48px] shrink-0 items-center gap-1 border-b px-4">
      {/* Sidebar toggle — desktop: collapse/expand, mobile: open overlay */}
      <button
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? t('topbar.expandSidebar') : t('topbar.collapseSidebar')}
        className="text-muted-foreground hover:text-foreground hover:bg-accent mr-1 hidden h-8 w-8 items-center justify-center rounded-lg transition-colors md:flex"
      >
        <PanelLeft className="h-4 w-4" />
      </button>
      {onToggleMobileSidebar && (
        <button
          onClick={onToggleMobileSidebar}
          title={t('topbar.openMenu')}
          className="text-muted-foreground hover:text-foreground hover:bg-accent mr-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors md:hidden"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1" />

      {/* Action buttons */}
      <button className="border-border hover:border-foreground/40 h-7 rounded-lg border px-2.5 text-[11px] text-gray-600 transition-colors">
        {t('topbar.feedback')}
      </button>
      <button className="border-border hover:border-foreground/40 h-7 rounded-lg border px-2.5 text-[11px] text-gray-600 transition-colors">
        {t('topbar.support')}
      </button>

      <div className="bg-border mx-1 h-5 w-px" />

      <button className="text-muted-foreground hover:text-foreground hover:bg-accent flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
        <Folder className="h-4 w-4" />
      </button>
      <div className="relative">
        <button
          onClick={() => setNotificationsOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground hover:bg-accent relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute top-1 right-1 h-1.5 w-1.5 rounded-full',
                hasUrgent ? 'animate-pulse bg-red-500' : 'bg-foreground'
              )}
            />
          )}
        </button>
        {notificationsOpen && (
          <NotificationPanel
            notifications={notifications}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onClose={() => setNotificationsOpen(false)}
          />
        )}
      </div>

      {/* Avatar + Dropdown */}
      <div className="relative ml-1">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="bg-muted text-foreground hover:ring-border flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all hover:ring-2"
        >
          {initials}
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="bg-background border-border absolute top-[calc(100%+8px)] right-0 z-50 w-52 overflow-hidden rounded-xl border py-1 shadow-lg">
              {/* Workspaces */}
              {userTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSwitchWorkspace(t.id)}
                  className="hover:bg-accent flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                >
                  <div className="bg-foreground text-background flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold">
                    {t.name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-foreground flex-1 truncate text-left font-medium">
                    {t.name}
                  </span>
                  {planData && team?.id === t.id && (
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                      {planData.planName}
                    </span>
                  )}
                  {team?.id === t.id && <Check className="text-foreground h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
              <button className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors">
                <Plus className="h-4 w-4" />
                {t('topbar.newWorkspace')}
              </button>

              <div className="border-border my-1 border-t" />

              <button
                onClick={() => {
                  setDropdownOpen(false)
                  onOpenSettings?.()
                }}
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              >
                <Settings className="h-4 w-4" />
                {t('topbar.accountSettings')}
              </button>
              <button
                onClick={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark')
                  setDropdownOpen(false)
                }}
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              >
                <Palette className="h-4 w-4" />
                <span className="flex-1 text-left">{language === 'pt-BR' ? 'Tema' : 'Theme'}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setLanguage(language === 'pt-BR' ? 'en' : 'pt-BR')
                  setDropdownOpen(false)
                }}
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span className="flex-1 text-left">{t('topbar.language')}</span>
                <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium">
                  {language === 'pt-BR' ? 'PT' : 'EN'}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              <div className="border-border my-1 border-t" />
              <button
                onClick={handleSignOut}
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t('topbar.logout')}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
