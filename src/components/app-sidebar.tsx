'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
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
  Menu,
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/theme-toggle'
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
        <span className="text-sidebar-foreground/60 text-[10px]">{label}</span>
      </div>
      <div className="bg-sidebar-accent h-1 w-full rounded-full">
        <div
          className={cn(
            'h-1 rounded-full transition-all',
            isOver ? 'bg-destructive' : 'bg-sidebar-primary'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNavAction(item: NavItem) {
    if (item.action === 'command-menu') {
      onOpenCommandMenu?.()
    } else if (item.action === 'settings') {
      onOpenSettings?.()
    }
  }

  function renderNavItem(item: NavItem) {
    const isActive = !item.action && pathname.startsWith(item.href)
    const Icon = item.icon
    const classes = cn(
      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
      isActive
        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    )

    if (item.action) {
      return (
        <button
          type="button"
          onClick={() => handleNavAction(item)}
          aria-label={item.label}
          className={classes}
        >
          <Icon className="h-5 w-5" />
        </button>
      )
    }

    return (
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        className={classes}
      >
        <Icon className="h-5 w-5" />
      </Link>
    )
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="mb-2 flex flex-col items-center gap-2">
        <div className="bg-brand-accent flex h-10 w-10 items-center justify-center rounded-lg">
          <span className="text-sidebar-foreground text-lg font-bold">R</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Create new"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Create new</TooltipContent>
        </Tooltip>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-1 pt-2">
        {navItems.map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>{renderNavItem(item)}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ))}
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

      {/* Theme Toggle */}
      <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mb-2" />

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
              {user.fullName && <p className="text-sm leading-none font-medium">{user.fullName}</p>}
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
    </>
  )

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile hamburger trigger */}
      <div className="border-border bg-background fixed top-0 left-0 z-40 flex h-14 w-full items-center border-b px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-16 p-0 py-4">
            <div className="flex h-full flex-col items-center">{sidebarContent}</div>
          </SheetContent>
        </Sheet>
        <div className="bg-brand-accent ml-2 flex h-8 w-8 items-center justify-center rounded-lg">
          <span className="text-sidebar-foreground text-sm font-bold">R</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center border-r py-4 md:flex">
        {sidebarContent}
      </div>
    </TooltipProvider>
  )
}
