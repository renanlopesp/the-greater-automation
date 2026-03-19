'use client'

import { useState, useEffect, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import AppSidebarNew from '@/components/app-sidebar-new'
import TopBar from '@/components/top-bar'
import { LanguageProvider } from '@/contexts/language-context'
import type {
  UserData,
  TeamData,
  UsageData,
  PlanData,
  TeamMember,
  TeamInvitation,
} from '@/types/navigation'

const SettingsDialog = dynamic(() => import('@/components/settings/settings-dialog'))

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed'

interface DashboardShellNewProps {
  children: ReactNode
  user: UserData
  team: { id: string; name: string; slug: string } | null
  userTeams: { id: string; name: string; role: string }[]
  usage: UsageData | null
  planData?: PlanData | null
  orchestratorId?: string | null
  installedAgents?: Array<{
    id: string
    name: string
    agentType: string | null
    status: string | null
  }>
  initialLanguage?: string
  members?: TeamMember[]
  invitations?: TeamInvitation[]
  currentUserRole?: 'owner' | 'admin' | 'member'
  storeData?: {
    id: string
    name: string
    segment: string
    platform: string | null
    platform_store_id: string | null
    last_sync_at: string | null
    settings: Record<string, unknown> | null
  } | null
}

export default function DashboardShellNew({
  children,
  user,
  team,
  userTeams,
  usage,
  planData,
  orchestratorId,
  installedAgents = [],
  initialLanguage,
  members = [],
  invitations = [],
  currentUserRole = 'member',
  storeData = null,
}: DashboardShellNewProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return stored === null || stored === 'true'
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

  const handleToggleMobile = () => {
    setMobileOpen((o) => !o)
  }

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
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
          <AppSidebarNew
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
            usage={usage}
            planData={planData}
            orchestratorId={orchestratorId}
            installedAgents={installedAgents}
            teamName={team?.name}
          />
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
            usage={usage}
            planData={planData}
            orchestratorId={orchestratorId}
            installedAgents={installedAgents}
            teamName={team?.name}
          />
        </div>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar
            onToggleSidebar={handleToggleCollapse}
            onToggleMobileSidebar={handleToggleMobile}
            sidebarCollapsed={collapsed}
            user={user}
            team={team}
            userTeams={userTeams}
            planData={planData}
            onOpenSettings={() => {
              setSettingsEverOpened(true)
              setSettingsOpen(true)
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
            usage={usage}
            members={members}
            invitations={invitations}
            currentUserRole={currentUserRole}
            currentUserId={user.id}
            planData={planData ?? null}
            storeData={storeData}
          />
        )}
      </div>
    </LanguageProvider>
  )
}
