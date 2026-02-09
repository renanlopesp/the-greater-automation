'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Bot,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Moon,
  Play,
  Plug,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
import type { UsageData, UserData } from '@/types/navigation'

interface AppSidebarProps {
  user: UserData
  usage: UsageData | null
  onOpenCommandMenu?: () => void
  onOpenSettings?: () => void
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

export default function AppSidebar({ user, onOpenCommandMenu, onOpenSettings }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const platformItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Workspace', href: '/workspace', icon: FolderKanban },
    { label: 'Runs', href: '/runs', icon: Play },
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
            <SidebarMenuButton size="lg" asChild tooltip="Home">
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Bot className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Workflows</span>
                  <span className="text-muted-foreground truncate text-xs">Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
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
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={user.fullName ?? user.email}>
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
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
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
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

      <SidebarRail data-sidebar="rail" className="after:content-none" />
    </Sidebar>
  )
}
