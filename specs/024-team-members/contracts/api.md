# API Contracts: Team Members Management

## Server Actions (`src/lib/actions/members.ts`)

### inviteMemberAction

```typescript
inviteMemberAction(formData: FormData): Promise<{ error?: string; success?: boolean }>
```

**Input** (FormData):

- `email`: string (required, valid email)
- `role`: 'admin' | 'member' (required)

**Behavior**:

1. Validate email format (Zod)
2. Get current user and their team
3. Verify caller is owner or admin
4. Check if email is already a team member → error
5. Check if pending invitation exists for email → error
6. Check if email belongs to existing Snew user → add directly to team_members
7. Otherwise → create team_invitations record (status: pending, expires_at: now + 7 days)
8. Create in-app notification for the invitee (if existing user)

**Errors**: "Not authorized", "This user is already a member", "An invitation is already pending for this email", "Invalid email address"

---

### acceptInvitationAction

```typescript
acceptInvitationAction(invitationId: string): Promise<{ error?: string; success?: boolean }>
```

**Behavior**:

1. Verify invitation exists and is pending
2. Verify invitation is not expired
3. Verify caller's email matches invitation email
4. Add user to team_members with assigned role
5. Update invitation status to 'accepted'

**Errors**: "Invitation not found", "This invitation has expired", "This invitation is no longer valid"

---

### declineInvitationAction

```typescript
declineInvitationAction(invitationId: string): Promise<{ error?: string; success?: boolean }>
```

**Behavior**:

1. Verify invitation exists and is pending
2. Verify caller's email matches invitation email
3. Update invitation status to 'declined'

---

### updateMemberRoleAction

```typescript
updateMemberRoleAction(formData: FormData): Promise<{ error?: string; success?: boolean }>
```

**Input** (FormData):

- `userId`: string (target user ID)
- `role`: 'admin' | 'member'

**Behavior**:

1. Verify caller is owner
2. Verify target is not the caller (can't change own role)
3. Update team_members role

**Errors**: "Only team owners can change roles", "Cannot change your own role"

---

### removeMemberAction

```typescript
removeMemberAction(userId: string): Promise<{ error?: string; success?: boolean }>
```

**Behavior**:

1. Verify caller is owner or admin
2. Verify target is not the owner (can't remove owner)
3. If caller is admin, verify target is not admin (admins can't remove admins)
4. Delete from team_members

**Errors**: "Not authorized", "Cannot remove the team owner", "Admins cannot remove other admins"

---

### cancelInvitationAction

```typescript
cancelInvitationAction(invitationId: string): Promise<{ error?: string; success?: boolean }>
```

**Behavior**:

1. Verify caller is owner or admin
2. Verify invitation exists and is pending
3. Update invitation status to 'cancelled'

---

## Query Functions (`src/lib/queries/members.ts`)

### fetchTeamMembers

```typescript
fetchTeamMembers(supabase: SupabaseClient, teamId: string): Promise<TeamMember[]>
```

**Returns**: Array of `{ id, fullName, email, avatarUrl, role, joinedAt }`

**Query**: Join `team_members` with `profiles` on `user_id = profiles.id`, filter by `team_id`

---

### fetchTeamInvitations

```typescript
fetchTeamInvitations(supabase: SupabaseClient, teamId: string): Promise<TeamInvitation[]>
```

**Returns**: Array of `{ id, email, role, invitedBy, status, expiresAt, createdAt }`

**Query**: Select from `team_invitations` where `team_id` matches and `status = 'pending'` and `expires_at > now()`

---

### fetchPendingInvitationsForUser

```typescript
fetchPendingInvitationsForUser(supabase: SupabaseClient, email: string): Promise<TeamInvitation[]>
```

**Returns**: Array of pending, non-expired invitations for the given email with team name

**Query**: Join `team_invitations` with `teams`, filter by email, status = 'pending', expires_at > now()
