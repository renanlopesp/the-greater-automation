'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Search,
  FolderOpen,
  Play,
  Grid2x2,
  HelpCircle,
  Plus,
  LogOut,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { NavItem, UsageData, UserData } from '@/types/navigation'

interface AppSidebarProps {
  user: UserData
  usage: UsageData | null
  onOpenCommandMenu?: () => void
  onOpenSettings?: () => void
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Search', href: '#', icon: Search, action: 'command-menu' },
  { label: 'Workspace', href: '/workspace', icon: FolderOpen },
  { label: 'Runs', href: '/runs', icon: Play },
  { label: 'Apps', href: '#', icon: Grid2x2, action: 'settings' },
  { label: 'Support', href: '#', icon: HelpCircle, action: 'external' },
]

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email[0].toUpperCase()
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const isOver = limit > 0 && used >= limit

  return (
    <div className="w-full px-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-muted-foreground text-[10px]">{label}</span>
      </div>
      <div className="bg-muted h-1 w-full rounded-full">
        <div
          className={cn(
            'h-1 rounded-full transition-all',
            isOver ? 'bg-destructive' : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function AppSidebar({
  user,
  usage,
  onOpenCommandMenu,
  onOpenSettings,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNavClick(item: NavItem, e: React.MouseEvent) {
    if (item.action === 'command-menu') {
      e.preventDefault()
      onOpenCommandMenu?.()
    } else if (item.action === 'settings') {
      e.preventDefault()
      onOpenSettings?.()
    } else if (item.action === 'external') {
      e.preventDefault()
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="border-border bg-background fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center border-r py-4 md:flex">
        {/* Logo */}
        <div className="mb-2 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-lg font-bold text-white">R</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Create new</TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1 pt-2">
          {navItems.map((item) => {
            const isActive = !item.action && pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={(e) => handleNavClick(item, e)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Usage Meters */}
        <div className="mb-2 flex w-full flex-col gap-2">
          <UsageMeter label="Steps" used={usage?.stepsUsed ?? 0} limit={usage?.stepsLimit ?? 1} />
          <UsageMeter
            label="AI Credits"
            used={usage?.aiCreditsUsed ?? 0}
            limit={usage?.aiCreditsLimit ?? 1}
          />
        </div>

        {/* Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? user.email} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.fullName, user.email)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {user.fullName && (
                  <p className="text-sm leading-none font-medium">{user.fullName}</p>
                )}
                <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onOpenSettings?.()}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}
