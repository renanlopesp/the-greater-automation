'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Bell,
  Bot,
  Check,
  ChevronDown,
  Clock,
  Compass,
  Home,
  LayoutGrid,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Zap,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { UsageData, UserData, TeamData, PlanData } from '@/types/navigation'
import { switchWorkspaceAction } from '@/lib/actions/workspace'

interface AppSidebarProps {
  user: UserData
  team: TeamData | null
  userTeams: { id: string; name: string; role: string }[]
  usage: UsageData | null
  planData?: PlanData | null
  orchestratorId?: string | null
  hasStore?: boolean
  notificationCount?: number
  onOpenCommandMenu?: () => void
  onOpenSettings?: () => void
  onSwitchWorkspace?: (name: string, transition: () => Promise<void>) => void
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email[0].toUpperCase()
}

export default function AppSidebar({
  user,
  team,
  userTeams,
  usage,
  planData,
  orchestratorId,
  notificationCount = 0,
  onOpenCommandMenu,
  onOpenSettings,
  onSwitchWorkspace,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleSwitchWorkspace(teamId: string) {
    if (team?.id === teamId) return
    const targetTeam = userTeams.find((t) => t.id === teamId)
    if (onSwitchWorkspace) {
      onSwitchWorkspace(targetTeam?.name ?? 'workspace', async () => {
        await switchWorkspaceAction(teamId)
        router.refresh()
      })
    } else {
      switchWorkspaceAction(teamId).then(() => router.refresh())
    }
  }

  const navItems = useMemo(
    () => [
      { label: 'Home', icon: Home, href: '/dashboard' },
      ...(orchestratorId
        ? [{ label: 'New Chat', icon: Plus, href: `/agents/${orchestratorId}` }]
        : []),
      { label: 'Agents', icon: Bot, href: '/agents' },
      { label: 'Apps', icon: LayoutGrid, href: '/apps' },
      { label: 'Notifications', icon: Bell, href: '/notifications', badge: notificationCount },
      { label: 'History', icon: Clock, href: '/history' },
    ],
    [orchestratorId, notificationCount]
  )

  const creditsRemaining = usage ? Math.max(0, usage.aiCreditsLimit - usage.aiCreditsUsed) : null

  return (
    <Sidebar side="left" className="w-[240px] min-w-[240px] border-r">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full">
                  <Avatar className="size-8 rounded-full">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? 'User'} />
                    <AvatarFallback className="rounded-full text-xs">
                      {getInitials(user.fullName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.fullName ?? 'User'}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="start">
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userTeams.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => handleSwitchWorkspace(t.id)}>
                    <span className="flex-1">{t.name}</span>
                    <span className="text-muted-foreground text-xs capitalize">{t.role}</span>
                    {team?.id === t.id && <Check className="ml-2 size-4" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onOpenSettings?.()}>
                  <Settings className="mr-2 size-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? (
                    <Sun className="mr-2 size-4" />
                  ) : (
                    <Moon className="mr-2 size-4" />
                  )}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarMenu className="gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton asChild isActive={isActive} className="h-9 gap-3 px-3 text-sm">
                  <Link href={item.href}>
                    <item.icon className="size-4" />
                    <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                    {'badge' in item && item.badge ? (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]"
                      >
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto space-y-2 p-3">
        {creditsRemaining !== null && (
          <div className="text-muted-foreground flex items-center gap-2 px-3 py-1.5 text-sm">
            <Zap className="size-4" />
            <span>{creditsRemaining} credits remaining</span>
          </div>
        )}
        {planData?.planId === 'free' && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenSettings?.()}>
            Upgrade
          </Button>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground h-9 gap-3 px-3 text-sm">
              <Link href="/agents">
                <Compass className="size-4" />
                <span>Discover</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
