'use client'

import { useState, type ReactNode } from 'react'
import AppSidebar from '@/components/app-sidebar'
import CommandMenu from '@/components/command-menu'
import SearchTrigger from '@/components/search-trigger'
import { SettingsDialog } from '@/components/settings'
import type { UsageData, UserData, TeamData } from '@/types/navigation'

interface DashboardShellProps {
  user: UserData
  team: TeamData | null
  usage: UsageData | null
  children: ReactNode
}

export default function DashboardShell({ user, team, usage, children }: DashboardShellProps) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex h-screen">
      <AppSidebar
        user={user}
        usage={usage}
        onOpenCommandMenu={() => setCommandMenuOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="flex flex-1 flex-col overflow-auto md:ml-16">
        <div className="border-border flex items-center gap-4 border-b px-6 py-3">
          <SearchTrigger onOpen={() => setCommandMenuOpen(true)} />
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
      <CommandMenu
        teamId={team?.id ?? null}
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        profile={{
          fullName: user.fullName ?? '',
          email: user.email,
          avatarUrl: user.avatarUrl,
        }}
        team={team ? { name: team.name, slug: team.slug } : null}
        usage={
          usage
            ? {
                stepsUsed: usage.stepsUsed,
                stepsLimit: usage.stepsLimit,
                aiCreditsUsed: usage.aiCreditsUsed,
                aiCreditsLimit: usage.aiCreditsLimit,
              }
            : null
        }
        members={[
          {
            id: user.id,
            fullName: user.fullName ?? user.email,
            email: user.email,
            role: 'owner',
          },
        ]}
      />
    </div>
  )
}
