/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { TeamMember, TeamInvitation } from '@/types/navigation'

type Client = SupabaseClient<Database>

export async function fetchTeamMembers(supabase: Client, teamId: string): Promise<TeamMember[]> {
  const { data } = await supabase
    .from('team_members')
    .select('user_id, role, created_at, profiles!inner(id, email, full_name, avatar_url)')
    .eq('team_id', teamId)

  if (!data) return []

  return data.map((row: any) => ({
    id: row.profiles.id,
    fullName: row.profiles.full_name ?? row.profiles.email,
    email: row.profiles.email,
    avatarUrl: row.profiles.avatar_url,
    role: row.role,
    joinedAt: row.created_at,
  }))
}

export async function fetchTeamInvitations(
  supabase: Client,
  teamId: string
): Promise<TeamInvitation[]> {
  const { data } = await (supabase as any)
    .from('team_invitations')
    .select('id, email, role, invited_by, status, expires_at, created_at')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }))
}

export async function fetchPendingInvitationsForUser(
  supabase: Client,
  email: string
): Promise<(TeamInvitation & { teamName: string })[]> {
  const { data } = await (supabase as any)
    .from('team_invitations')
    .select('id, email, role, invited_by, status, expires_at, created_at, team_id, teams(name)')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    teamName: row.teams?.name ?? 'a team',
  }))
}
