# Feature Specification: Team Members Management

**Feature Branch**: `024-team-members`
**Created**: 2026-02-17
**Status**: Draft
**Input**: User description: "Members system - Team member management with invite, roles, and permissions"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Team Members (Priority: P1)

As a team member, I want to see all members of my team in the Settings > Members section so that I know who has access to the workspace.

**Why this priority**: Foundation for all member management — users must be able to see the team before managing it.

**Independent Test**: Open Settings > Members and verify the list shows all team members with their names, emails, avatars, and roles.

**Acceptance Scenarios**:

1. **Given** a team with 3 members, **When** I open Settings > Members, **Then** I see all 3 members with their avatar, name, email, and role badge
2. **Given** I am the only member, **When** I open Settings > Members, **Then** I see myself listed as "Owner"
3. **Given** the members list is loading, **When** I open Settings > Members, **Then** I see a loading skeleton until data arrives

---

### User Story 2 - Invite New Members (Priority: P1)

As a team owner or admin, I want to invite new members via email so that they can join my workspace.

**Why this priority**: Core feature — the primary way to add people to the team.

**Independent Test**: Click "Invite member", enter an email, select a role, submit, and verify the invitation appears as pending.

**Acceptance Scenarios**:

1. **Given** I am an owner/admin, **When** I click "Invite member" and enter a valid email with role "member", **Then** a pending invitation is created and displayed in the members list
2. **Given** I am an owner/admin, **When** I invite an email that is already a team member, **Then** I see an error "This user is already a member"
3. **Given** I am an owner/admin, **When** I invite an email that already has a pending invite, **Then** I see an error "An invitation is already pending for this email"
4. **Given** I am a regular member (not owner/admin), **When** I view the Members section, **Then** the "Invite member" button is not visible
5. **Given** I am an owner/admin, **When** I invite a user who already has a Snew account, **Then** they are added directly to the team (no invitation needed)

---

### User Story 3 - Accept/Decline Invitations (Priority: P1)

As a user who received an invitation, I want to accept or decline the team invite so that I can join the workspace.

**Why this priority**: Completes the invite flow — without this, invitations are useless.

**Independent Test**: Receive an invitation, log in, see the pending invite notification, and accept/decline it.

**Acceptance Scenarios**:

1. **Given** I have a pending invitation, **When** I log in and navigate to the dashboard, **Then** I see a notification or banner about the pending invitation
2. **Given** I have a pending invitation, **When** I accept it, **Then** I become a member of the team with the assigned role and the invitation is removed
3. **Given** I have a pending invitation, **When** I decline it, **Then** the invitation is removed and I am not added to the team
4. **Given** I have a pending invitation, **When** the invitation expires (after 7 days), **Then** it is automatically removed

---

### User Story 4 - Manage Member Roles (Priority: P2)

As a team owner, I want to change member roles so that I can control who can manage the team.

**Why this priority**: Important for team governance but not blocking for initial member management.

**Independent Test**: As owner, change a member's role from "member" to "admin" and verify the change persists.

**Acceptance Scenarios**:

1. **Given** I am the owner, **When** I click the role badge of a member, **Then** I see a dropdown with role options (admin, member)
2. **Given** I am the owner, **When** I change a member's role to "admin", **Then** the role is updated immediately and they gain admin permissions
3. **Given** I am an admin, **When** I view member roles, **Then** I cannot change any roles (only owners can)
4. **Given** I am the owner, **When** I try to change my own role, **Then** the role dropdown is disabled (cannot demote yourself)

---

### User Story 5 - Remove Members (Priority: P2)

As a team owner or admin, I want to remove members from the team so that I can revoke access.

**Why this priority**: Essential for security but secondary to adding members.

**Independent Test**: As owner, remove a member and verify they no longer appear in the list.

**Acceptance Scenarios**:

1. **Given** I am an owner/admin, **When** I click "Remove" on a member, **Then** I see a confirmation dialog before the action
2. **Given** I confirm the removal, **When** the action completes, **Then** the member is removed from the list and loses access to the workspace
3. **Given** I am the owner, **When** I try to remove myself, **Then** the remove option is not available (cannot remove the owner)
4. **Given** I am an admin, **When** I try to remove the owner, **Then** the remove option is not available
5. **Given** I am an admin, **When** I try to remove another admin, **Then** the remove option is not available (only owners can remove admins)

---

### User Story 6 - Cancel Pending Invitations (Priority: P3)

As a team owner or admin, I want to cancel a pending invitation so that I can revoke it before it is accepted.

**Why this priority**: Nice to have for managing pending invites.

**Independent Test**: Send an invitation, then cancel it and verify it no longer appears.

**Acceptance Scenarios**:

1. **Given** there is a pending invitation, **When** I click "Cancel" on the pending invite row, **Then** the invitation is removed
2. **Given** a pending invitation exists, **When** the invitee tries to accept after cancellation, **Then** they see an error "This invitation is no longer valid"

---

### Edge Cases

- What happens when the last owner tries to leave the team? The system prevents this — there must always be at least one owner.
- What happens when a user is invited but doesn't have an account? They receive the invite when they sign up with that email.
- What happens when the team reaches a member limit? For the free/pro plan, we assume no hard member limit initially.
- What happens when a removed member has active workflows? Their workflows remain — workflows belong to the team, not individual users.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display all team members with their avatar, full name, email, and role in the Settings > Members section
- **FR-002**: System MUST allow owners and admins to invite new members by email address with a selected role (admin or member)
- **FR-003**: System MUST create a `team_invitations` record for pending invitations with an expiration of 7 days
- **FR-004**: System MUST allow invited users to accept or decline pending invitations
- **FR-005**: System MUST automatically add users who already have a Snew account directly to the team (skip invitation pending state)
- **FR-006**: System MUST send an in-app notification to invited users about pending invitations
- **FR-007**: System MUST allow only owners to change member roles (owner can assign admin or member)
- **FR-008**: System MUST allow owners and admins to remove members, with role hierarchy enforcement (admins cannot remove owners or other admins)
- **FR-009**: System MUST prevent the last owner from being removed or demoted
- **FR-010**: System MUST allow owners and admins to cancel pending invitations
- **FR-011**: System MUST show pending invitations separately from active members with a "Pending" status indicator
- **FR-012**: System MUST update the RLS policy on `team_members` so that all team members can view other members of the same team
- **FR-013**: System MUST show role-appropriate UI controls (invite button, role dropdown, remove button) based on the current user's role
- **FR-014**: System MUST fetch real team members data from the database instead of the current hardcoded array

### Key Entities

- **Team Member**: A user who belongs to a team with a specific role (owner, admin, member). Stored in existing `team_members` table.
- **Team Invitation**: A pending invite to join a team, with email, assigned role, inviter, expiration date, and status. New `team_invitations` table.
- **Team**: The workspace that members belong to. Existing `teams` table.

## Assumptions

- The existing `team_role` enum (owner, admin, member) is sufficient — no new roles needed
- Email invitations are in-app only (no email sending service integration for now)
- A team always has exactly one owner (transfer ownership is out of scope)
- No member limit enforcement for the current plan
- The current user's role is derived from the `team_members` table at query time

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Team owners can invite a new member in under 30 seconds (enter email, select role, confirm)
- **SC-002**: Invited users can accept or decline an invitation in under 2 clicks after logging in
- **SC-003**: All team members can view the complete member list with correct roles upon opening Settings > Members
- **SC-004**: Role changes and member removals take effect immediately (no page refresh required)
- **SC-005**: Pending invitations are clearly distinguishable from active members in the UI
- **SC-006**: The member management flow works correctly for teams with up to 50 members
