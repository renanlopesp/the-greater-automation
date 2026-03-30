'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { SVGFilters } from '@/config/design-system'
import { AppSidebarNew } from '@/components/layout/app-sidebar-new'
import { TopBar } from '@/components/layout/top-bar'
import { LanguageProvider } from '@/contexts/language-context'
import { switchWorkspaceAction } from '@/lib/actions/workspace'
import { useShellData } from '@/hooks/use-shell-data'

const SettingsDialog = dynamic(() => import('@/components/settings/settings-dialog'))

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed'

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

interface DashboardShellNewProps {
  children: ReactNode
}

export default function DashboardShellNew({ children }: DashboardShellNewProps) {
  const router = useRouter()
  const { data: shellData } = useShellData()

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      return stored === null || stored === 'true'
    } catch {
      return true
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsEverOpened, setSettingsEverOpened] = useState(false)

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }

  // Handle redirect (e.g., no team → onboarding)
  if (shellData?.redirect) {
    router.push(shellData.redirect)
    return null
  }

  const user = shellData?.user ?? { id: '', email: '', fullName: null, avatarUrl: null }
  const team = shellData?.team ?? null
  const userTeams = shellData?.userTeams ?? []

  return (
    <LanguageProvider initialLanguage={shellData?.language ?? undefined}>
      <SVGFilters />
      <div className="flex h-screen w-full overflow-hidden">
        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar — desktop */}
        <div className="relative hidden shrink-0 md:block">
          <AppSidebarNew collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
        </div>

        {/* Sidebar — mobile overlay */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AppSidebarNew
            collapsed={false}
            onToggleCollapse={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
          />
        </div>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar
            userInitials={getInitials(user.fullName, user.email)}
            userName={user.fullName ?? undefined}
            userEmail={user.email}
            userTeams={userTeams}
            activeTeamId={team?.id}
            onOpenSettings={() => {
              setSettingsEverOpened(true)
              setSettingsOpen(true)
            }}
            onSwitchWorkspace={(teamId) => {
              switchWorkspaceAction(teamId).then(() => router.refresh())
            }}
          />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        {settingsEverOpened && (
          <SettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            profile={{
              fullName: user.fullName ?? '',
              email: user.email,
              avatarUrl: user.avatarUrl,
            }}
            team={team ? { name: team.name, slug: team.slug } : null}
            teamId={team?.id}
            currentUserId={user.id}
          />
        )}
      </div>
    </LanguageProvider>
  )
}
