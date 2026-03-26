'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AppSidebar from '@/components/app-sidebar'
import CommandMenu from '@/components/command-menu'
import type { SettingsSection } from '@/components/settings/settings-sidebar'
import { CommandMenuContext } from '@/lib/command-menu-context'

const SettingsDialog = dynamic(() => import('@/components/settings/settings-dialog'))
import { Loader2 } from 'lucide-react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
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

export default function DashboardShell({
  user,
  team,
  userTeams,
  usage,
  members,
  invitations,
  pendingUserInvitations,
  currentUserRole,
  planData,
  storeData,
  orchestratorId,
  children,
}: DashboardShellProps) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsEverOpened, setSettingsEverOpened] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined)
  const [isSwitchingWorkspace, startWorkspaceTransition] = useTransition()
  const [switchingToName, setSwitchingToName] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  // Auto-open settings from URL params (e.g. after OAuth callback or redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const openSettingsParam = params.get('open_settings')
    if (openSettingsParam) {
      setSettingsSection(openSettingsParam as SettingsSection)
      setSettingsEverOpened(true)
      setSettingsOpen(true)
      if (openSettingsParam === 'store') {
        toast.success('Nuvemshop conectada com sucesso!')
      }
      params.delete('open_settings')
      const newPath = params.size > 0 ? `${pathname}?${params}` : pathname
      router.replace(newPath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  return (
    <CommandMenuContext value={() => setCommandMenuOpen(true)}>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar
          user={user}
          team={team}
          userTeams={userTeams}
          usage={usage}
          planData={planData}
          orchestratorId={orchestratorId}
          hasStore={!!storeData}
          onOpenCommandMenu={() => setCommandMenuOpen(true)}
          onOpenSettings={() => {
            setSettingsEverOpened(true)
            setSettingsOpen(true)
          }}
          onSwitchWorkspace={(name, transition) => {
            setSwitchingToName(name)
            startWorkspaceTransition(transition)
          }}
        />
        <SidebarInset>
          <div className="flex h-12 items-center px-4 md:hidden">
            <SidebarTrigger />
          </div>
          <div className="relative flex-1 overflow-y-auto">
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
        {settingsEverOpened && (
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
            currentUserId={user.id}
          />
        )}
      </SidebarProvider>
    </CommandMenuContext>
  )
}
