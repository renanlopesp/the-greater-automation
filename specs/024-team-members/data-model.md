# Data Model: Team Members Management

## Existing Entities (no changes)

### teams

| Field      | Type            | Notes                   |
| ---------- | --------------- | ----------------------- |
| id         | uuid (PK)       | Auto-generated          |
| name       | text            | Team display name       |
| slug       | text            | URL-friendly identifier |
| avatar_url | text (nullable) | Team avatar             |
| created_at | timestamptz     | Auto-set                |
| updated_at | timestamptz     | Auto-set                |

### team_members

| Field      | Type                   | Notes                                  |
| ---------- | ---------------------- | -------------------------------------- |
| team_id    | uuid (FK → teams)      | Composite PK part                      |
| user_id    | uuid (FK → auth.users) | Composite PK part                      |
| role       | team_role enum         | owner, admin, member (default: member) |
| created_at | timestamptz            | Auto-set                               |

**RLS Change Required**: SELECT policy must be updated from `user_id = auth.uid()` to allow viewing all members of teams you belong to.

### profiles

| Field      | Type                       | Notes |
| ---------- | -------------------------- | ----- |
| id         | uuid (PK, FK → auth.users) |       |
| email      | text                       |       |
| full_name  | text                       |       |
| avatar_url | text (nullable)            |       |

## New Entity

### team_invitations

| Field      | Type                   | Notes                                          |
| ---------- | ---------------------- | ---------------------------------------------- |
| id         | uuid (PK)              | Auto-generated                                 |
| team_id    | uuid (FK → teams)      | Target team                                    |
| email      | text                   | Invitee email (lowercase, trimmed)             |
| role       | team_role enum         | Assigned role (default: member)                |
| invited_by | uuid (FK → auth.users) | Who sent the invite                            |
| status     | text                   | 'pending', 'accepted', 'declined', 'cancelled' |
| expires_at | timestamptz            | created_at + 7 days                            |
| created_at | timestamptz            | Auto-set                                       |

**Constraints**:

- UNIQUE(team_id, email) WHERE status = 'pending' — prevent duplicate pending invites
- CHECK(role IN ('admin', 'member')) — cannot invite as owner

**RLS Policies**:

- SELECT: Team members (owner/admin) can view their team's invitations; invited users can view invitations for their email
- INSERT: Only owners/admins can create invitations
- UPDATE: Invited user can update status (accept/decline); owners/admins can cancel
- DELETE: Owners/admins can delete invitations

## Relationships

```
teams 1──N team_members N──1 auth.users
  │                              │
  └──────N team_invitations──────┘ (invited_by)
           │
           └── email (matches profiles.email for existing users)
```

## State Transitions

### Invitation Status

```
pending → accepted  (invitee accepts)
pending → declined  (invitee declines)
pending → cancelled (owner/admin cancels)
pending → expired   (filtered at query time, expires_at < now())
```
