'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getTeamPlan, hasFeature, canInviteMembers } from '@/lib/billing/feature-gate'
import { getUserTeamRole } from '@/lib/auth/require-role'

export type MembersActionResult = { error?: string; success?: boolean }

// T012: inviteMemberAction
export async function inviteMemberAction(formData: FormData): Promise<MembersActionResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const roleValue = formData.get('role') as string

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Invalid email address' }
  }

  // Validate role
  if (!roleValue || !['admin', 'member'].includes(roleValue)) {
    return { error: 'Invalid role' }
  }

  const role = roleValue as 'admin' | 'member'

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }

  const supabase = await createServerClient()

  // Verify caller is owner or admin
  if (!['owner', 'admin'].includes(info.role)) {
    return { error: 'Not authorized' }
  }

  // Plan check + member count are independent — fetch in parallel
  const [plan, { count: memberCount }] = await Promise.all([
    getTeamPlan(info.teamId),
    supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', info.teamId),
  ])

  if (!hasFeature(plan, 'invite_members')) {
    return { error: 'Upgrade to Pro to invite team members' }
  }

  if (!canInviteMembers(plan, memberCount ?? 0)) {
    return { error: `Your plan allows up to ${plan.maxTeamMembers} team members` }
  }

  // Check if email is already a team member
  const { data: existingMembers } = await supabase
    .from('team_members')
    .select('user_id, profiles!inner(email)')
    .eq('team_id', info.teamId)

  const isAlreadyMember = existingMembers?.some((m: any) => m.profiles.email === email)
  if (isAlreadyMember) {
    return { error: 'This user is already a member' }
  }

  // Check if pending invitation already exists
  const { data: existingInvites } = await (supabase as any)
    .from('team_invitations')
    .select('id')
    .eq('team_id', info.teamId)
    .eq('email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())

  if (existingInvites && existingInvites.length > 0) {
    return { error: 'An invitation is already pending for this email' }
  }

  // Create pending invitation (for both existing and new users)
  const { error: inviteError } = await (supabase as any).from('team_invitations').insert({
    team_id: info.teamId,
    email: email,
    role: role,
    invited_by: info.userId,
  })

  if (inviteError) {
    // Could be unique constraint violation
    if (inviteError.code === '23505') {
      return { error: 'An invitation is already pending for this email' }
    }
    return { error: 'Failed to create invitation' }
  }

  // If the user already has an account, create an in-app notification
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingProfile) {
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', info.teamId)
      .single()

    await supabase.from('notifications').insert({
      user_id: existingProfile.id,
      team_id: info.teamId,
      type: 'general',
      title: 'Team invitation',
      message: `You have been invited to join ${team?.name ?? 'a team'} as ${role}. Check your dashboard to accept.`,
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

// T018: acceptInvitationAction
export async function acceptInvitationAction(invitationId: string): Promise<MembersActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the user's email from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  // Get the invitation
  const { data: invitation } = await (supabase as any)
    .from('team_invitations')
    .select('*')
    .eq('id', invitationId)
    .single()

  if (!invitation) return { error: 'Invitation not found' }
  if (invitation.status !== 'pending') return { error: 'This invitation is no longer valid' }
  if (new Date(invitation.expires_at) < new Date()) return { error: 'This invitation has expired' }
  if (invitation.email !== profile.email) return { error: 'This invitation is not for you' }

  // Add user to team
  const { error: insertError } = await supabase.from('team_members').insert({
    team_id: invitation.team_id,
    user_id: user.id,
    role: invitation.role,
  })

  if (insertError) return { error: 'Failed to join team' }

  // Update invitation status
  await (supabase as any)
    .from('team_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)

  revalidatePath('/', 'layout')
  return { success: true }
}

// T018: declineInvitationAction
export async function declineInvitationAction(invitationId: string): Promise<MembersActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const { data: invitation } = await (supabase as any)
    .from('team_invitations')
    .select('*')
    .eq('id', invitationId)
    .single()

  if (!invitation) return { error: 'Invitation not found' }
  if (invitation.status !== 'pending') return { error: 'This invitation is no longer valid' }
  if (invitation.email !== profile.email) return { error: 'This invitation is not for you' }

  await (supabase as any)
    .from('team_invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId)

  revalidatePath('/', 'layout')
  return { success: true }
}

// T022: updateMemberRoleAction
export async function updateMemberRoleAction(formData: FormData): Promise<MembersActionResult> {
  const targetUserId = formData.get('userId') as string
  const roleValue = formData.get('role') as string

  if (!targetUserId || !roleValue || !['admin', 'member'].includes(roleValue)) {
    return { error: 'Invalid parameters' }
  }

  const newRole = roleValue as 'admin' | 'member'

  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }

  const supabase = await createServerClient()

  // Only owners can change roles
  if (info.role !== 'owner') {
    return { error: 'Only team owners can change roles' }
  }

  // Can't change own role
  if (targetUserId === info.userId) {
    return { error: 'Cannot change your own role' }
  }

  const { error } = await supabase
    .from('team_members')
    .update({ role: newRole })
    .eq('team_id', info.teamId)
    .eq('user_id', targetUserId)

  if (error) return { error: 'Failed to update role' }

  revalidatePath('/', 'layout')
  return { success: true }
}

// T026: removeMemberAction
export async function removeMemberAction(targetUserId: string): Promise<MembersActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }

  const supabase = await createServerClient()

  // Only owners and admins can remove
  if (!['owner', 'admin'].includes(info.role)) {
    return { error: 'Not authorized' }
  }

  // Can't remove yourself
  if (targetUserId === info.userId) {
    return { error: 'Cannot remove yourself' }
  }

  // Get target member's role
  const { data: targetMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', info.teamId)
    .eq('user_id', targetUserId)
    .single()

  if (!targetMember) return { error: 'Member not found' }

  // Can't remove the owner
  if (targetMember.role === 'owner') {
    return { error: 'Cannot remove the team owner' }
  }

  // Admins can't remove other admins
  if (info.role === 'admin' && targetMember.role === 'admin') {
    return { error: 'Admins cannot remove other admins' }
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', info.teamId)
    .eq('user_id', targetUserId)

  if (error) return { error: 'Failed to remove member' }

  revalidatePath('/', 'layout')
  return { success: true }
}

// T030: cancelInvitationAction
export async function cancelInvitationAction(invitationId: string): Promise<MembersActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }

  const supabase = await createServerClient()

  // Only owners and admins can cancel
  if (!['owner', 'admin'].includes(info.role)) {
    return { error: 'Not authorized' }
  }

  const { data: invitation } = await (supabase as any)
    .from('team_invitations')
    .select('status')
    .eq('id', invitationId)
    .eq('team_id', info.teamId)
    .single()

  if (!invitation) return { error: 'Invitation not found' }
  if (invitation.status !== 'pending') return { error: 'This invitation is no longer pending' }

  await (supabase as any)
    .from('team_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
    .eq('team_id', info.teamId)

  revalidatePath('/', 'layout')
  return { success: true }
}
