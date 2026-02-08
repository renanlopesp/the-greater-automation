import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  action?: 'command-menu' | 'settings' | 'external'
}

export interface UsageData {
  stepsUsed: number
  stepsLimit: number
  aiCreditsUsed: number
  aiCreditsLimit: number
}

export interface UserData {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export interface TeamData {
  id: string
  name: string
  slug: string
}
