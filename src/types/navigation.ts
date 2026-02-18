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

export interface TeamMember {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export interface TeamInvitation {
  id: string
  email: string
  role: 'admin' | 'member'
  invitedBy: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  expiresAt: string
  createdAt: string
  teamName?: string
}

export interface PlanData {
  planId: 'free' | 'pro' | 'enterprise'
  planName: string
  features: Record<string, boolean>
  maxTeamMembers: number
  hasStripeSubscription: boolean
  cancelAtPeriodEnd: boolean
}
