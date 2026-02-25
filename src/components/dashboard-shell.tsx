'use client'

import { useState, useTransition, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AppSidebar from '@/components/app-sidebar'
import CommandMenu from '@/components/command-menu'
import { SettingsDialog } from '@/components/settings'
import type { SettingsSection } from '@/components/settings/settings-sidebar'
import { CommandMenuContext } from '@/lib/command-menu-context'
import NotificationsPopover from '@/components/workflow-editor/notifications-popover'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Bell, Loader2 } from 'lucide-react'
import PendingInvitationsBanner from '@/components/settings/pending-invitations-banner'
import type {
  UsageData,
  UserData,
  TeamData,
  TeamMember,
  TeamInvitation,
  PlanData,
} from '@/types/navigation'

interface DashboardShellProps {
  user: UserData
  team: TeamData | null
  userTeams: { id: string; name: string; role: string }[]
  usage: UsageData | null
  members: TeamMember[]
  invitations: TeamInvitation[]
  pendingUserInvitations: (TeamInvitation & { teamName: string })[]
  currentUserRole: 'owner' | 'admin' | 'member'
  defaultSidebarOpen?: boolean
  planData: PlanData | null
  storeData: {
    id: string
    name: string
    segment: string
    platform: string | null
    platform_store_id: string | null
    last_sync_at: string | null
    settings: Record<string, unknown> | null
  } | null
  orchestratorId?: string | null
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

export default function DashboardShell({
  user,
  team,
  userTeams,
  usage,
  members,
  invitations,
  pendingUserInvitations,
  currentUserRole,
  defaultSidebarOpen = false,
  planData,
  storeData,
  orchestratorId,
  children,
}: DashboardShellProps) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined)
  const [isSwitchingWorkspace, startWorkspaceTransition] = useTransition()
  const [switchingToName, setSwitchingToName] = useState<string | null>(null)
  const currentTime = useCurrentTime()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Auto-open settings from URL params (e.g. after OAuth callback)
  const openSettingsParam = searchParams.get('open_settings')
  if (openSettingsParam && !settingsOpen) {
    setSettingsSection(openSettingsParam as SettingsSection)
    setSettingsOpen(true)
    toast.success('Nuvemshop conectada com sucesso!')
    // Clean URL params
    const params = new URLSearchParams(searchParams.toString())
    params.delete('open_settings')
    const newPath = params.size > 0 ? `${pathname}?${params}` : pathname
    router.replace(newPath)
  }

  return (
    <CommandMenuContext value={() => setCommandMenuOpen(true)}>
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <AppSidebar
          user={user}
          team={team}
          userTeams={userTeams}
          usage={usage}
          planData={planData}
          orchestratorId={orchestratorId}
          onOpenCommandMenu={() => setCommandMenuOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onSwitchWorkspace={(name, transition) => {
            setSwitchingToName(name)
            startWorkspaceTransition(transition)
          }}
        />
        <SidebarInset>
          <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-30 flex h-10 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
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
              <NotificationsPopover>
                <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
                  <Bell className="h-4 w-4" />
                </Button>
              </NotificationsPopover>
              {currentTime && (
                <span className="text-muted-foreground hidden text-sm md:inline">
                  {currentTime}
                </span>
              )}
            </div>
          </header>
          <div className="relative flex-1 overflow-auto">
            {isSwitchingWorkspace && (
              <div className="bg-background/80 absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 backdrop-blur-sm transition-opacity">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Switching to{' '}
                  <span className="text-foreground font-medium">{switchingToName}</span>...
                </p>
              </div>
            )}
            {pendingUserInvitations.length > 0 && (
              <div className="border-b px-4 py-3">
                <PendingInvitationsBanner invitations={pendingUserInvitations} />
              </div>
            )}
            {children}
          </div>
        </SidebarInset>
        <CommandMenu
          teamId={team?.id ?? null}
          open={commandMenuOpen}
          onOpenChange={setCommandMenuOpen}
        />
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          defaultSection={settingsSection}
          profile={{
            fullName: user.fullName ?? '',
            email: user.email,
            avatarUrl: user.avatarUrl,
          }}
          team={team ? { name: team.name, slug: team.slug } : null}
          teamId={team?.id}
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
          members={members}
          invitations={invitations}
          currentUserRole={currentUserRole}
          currentUserId={user.id}
          planData={planData}
          storeData={storeData}
        />
      </SidebarProvider>
    </CommandMenuContext>
  )
}
