'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Check,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Moon,
  Play,
  Plug,
  Search,
  Settings,
  Sun,
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
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { UsageData, UserData, TeamData, PlanData } from '@/types/navigation'
import { switchWorkspaceAction } from '@/lib/actions/workspace'

interface AppSidebarProps {
  user: UserData
  team: TeamData | null
  userTeams: { id: string; name: string; role: string }[]
  usage: UsageData | null
  planData?: PlanData | null
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
  planData,
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

  const platformItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Workspace', href: '/workspace', icon: FolderKanban },
    { label: 'Runs', href: '/runs', icon: Play },
    { label: 'Messaging', href: '/messaging', icon: MessageCircle },
  ]

  const toolItems = [
    { label: 'Search', icon: Search, action: 'command-menu' as const },
    { label: 'Integrations', icon: Plug, action: 'settings' as const },
  ]

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={team?.name ?? 'Select workspace'}>
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 535 323"
                      fill="none"
                      className="size-4"
                    >
                      <path
                        d="M400.165 220.285L354.779 323H0L94.3887 143.841L400.165 220.285Z"
                        fill="currentColor"
                      />
                      <path
                        d="M446.979 159.642L131.339 158.637L217.867 0H534.057L446.979 159.642Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{team?.name ?? 'Snew'}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {team
                        ? (userTeams.find((t) => t.id === team.id)?.role ?? 'member')
                        : 'No workspace'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
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
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platformItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    onClick={() => {
                      if (item.action === 'command-menu') onOpenCommandMenu?.()
                      else if (item.action === 'settings') onOpenSettings?.()
                    }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="dark:hidden" />
              <Moon className="hidden dark:block" />
              <span>Toggle theme</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {planData && planData.planId !== 'free' && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={`${planData.planName} plan`}
                onClick={() => onOpenSettings?.()}
              >
                <span className="bg-primary/10 text-primary flex size-4 shrink-0 items-center justify-center rounded text-[10px] leading-none font-bold">
                  {planData.planId === 'enterprise' ? 'E' : 'P'}
                </span>
                <span>{planData.planName} plan</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={user.fullName ?? user.email}>
                  <Avatar className="size-8 rounded-full">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? 'User'} />
                    <AvatarFallback className="rounded-full">
                      {getInitials(user.fullName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.fullName ?? 'User'}</span>
                    <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="min-w-56 rounded-lg">
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-full">
                      <AvatarImage
                        src={user.avatarUrl ?? undefined}
                        alt={user.fullName ?? 'User'}
                      />
                      <AvatarFallback className="rounded-full">
                        {getInitials(user.fullName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.fullName ?? 'User'}</span>
                      <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onOpenSettings?.()}>
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail data-sidebar="rail" className="after:content-none!" />
    </Sidebar>
  )
}
