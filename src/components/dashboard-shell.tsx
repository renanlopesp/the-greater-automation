'use client'

import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AppSidebar from '@/components/app-sidebar'
import CommandMenu from '@/components/command-menu'
import { SettingsDialog } from '@/components/settings'
import { CommandMenuContext } from '@/lib/command-menu-context'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Bell } from 'lucide-react'
import type { UsageData, UserData, TeamData } from '@/types/navigation'

interface DashboardShellProps {
  user: UserData
  team: TeamData | null
  usage: UsageData | null
  children: ReactNode
}

function formatTime() {
  const now = new Date()
  return (
    now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' \u00b7 ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

function subscribeToMinuteClock(callback: () => void) {
  const interval = setInterval(callback, 60_000)
  return () => clearInterval(interval)
}

function useCurrentTime() {
  return useSyncExternalStore(subscribeToMinuteClock, formatTime, () => '')
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Dashboard'
  if (pathname.startsWith('/workspace')) return 'Workspace'
  if (pathname.startsWith('/runs')) return 'Runs'
  if (pathname.startsWith('/agents')) return 'Agent Detail'
  return 'Dashboard'
}

export default function DashboardShell({ user, team, usage, children }: DashboardShellProps) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const currentTime = useCurrentTime()
  const pathname = usePathname()

  return (
    <CommandMenuContext value={() => setCommandMenuOpen(true)}>
      <SidebarProvider>
        <AppSidebar
          user={user}
          usage={usage}
          onOpenCommandMenu={() => setCommandMenuOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SidebarInset>
          <header className="flex h-10 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{getPageTitle(pathname)}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>
              {currentTime && (
                <span className="text-muted-foreground hidden text-sm md:inline">
                  {currentTime}
                </span>
              )}
            </div>
          </header>
          <div className="flex-1 overflow-auto">{children}</div>
        </SidebarInset>
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
      </SidebarProvider>
    </CommandMenuContext>
  )
}
