# Quickstart: Team Members Management

## Prerequisites

- Node.js 20+, bun installed
- Supabase project access (test branch: `ejqumzvclfkbbzzdvmmi`)
- `.env.local` configured with Supabase URL and keys

## Setup

```bash
# Switch to feature branch
git checkout 024-team-members

# Install dependencies (if any new ones added)
bun install

# Run dev server
bun dev
```

## Development Flow

### 1. Database Migration

Apply the `team_invitations` table migration and RLS fix via Supabase MCP or dashboard.

### 2. Server Actions

All member management logic lives in `src/lib/actions/members.ts`:

- `inviteMemberAction` — invite by email
- `acceptInvitationAction` / `declineInvitationAction` — handle invites
- `updateMemberRoleAction` — change member role (owner only)
- `removeMemberAction` — remove from team
- `cancelInvitationAction` — cancel pending invite

### 3. UI Components

- `src/components/settings/members-section.tsx` — main members list with role-based controls
- `src/components/settings/invite-member-dialog.tsx` — invite form dialog

### 4. Testing

```bash
# Run unit tests
bun run vitest run

# Run specific test file
bun run vitest run src/components/settings/__tests__/members-section.test.tsx
bun run vitest run src/lib/actions/__tests__/members.test.ts
```

## Key Decisions

- **No email service**: Invitations are in-app only. Users see pending invites when they log in.
- **Direct add for existing users**: If the invited email matches an existing Snew account, they're added immediately.
- **Role hierarchy**: owner > admin > member. Only owners change roles. Admins can't remove owners/admins.
- **7-day expiration**: Pending invitations expire after 7 days, filtered at query time.
