# Research: Team Members Management

## R-001: RLS Policy Fix for team_members

**Decision**: Update the SELECT policy on `team_members` from `user_id = auth.uid()` to a subquery that checks team co-membership.

**Rationale**: Current policy only allows users to see their own row, making it impossible to list teammates. The new policy uses `EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())` to allow viewing all members of teams you belong to.

**Alternatives considered**: Creating a database function for member listing (rejected — RLS fix is simpler and more idiomatic).

## R-002: Invitation Flow Design

**Decision**: In-app invitation only (no email service). Invited users who already have accounts are added directly. Invitations for non-existing users are stored as pending and shown when they sign up with that email.

**Rationale**: Adding an email service (SendGrid, Resend, etc.) is out of scope and adds complexity. The existing notification system (Feature 023) can deliver in-app notifications for invitations.

**Alternatives considered**: Email-based invitations with magic links (rejected — requires email service setup, out of YAGNI scope). Invite codes/URLs (rejected — email-based lookup is simpler for the use case).

## R-003: Role Hierarchy Enforcement

**Decision**: Enforce role hierarchy in server actions, not just UI. Hierarchy: owner > admin > member. Only owners can change roles. Owners and admins can remove members, but admins cannot remove owners or other admins.

**Rationale**: Server-side enforcement prevents bypassing UI restrictions via direct API calls. RLS policies already enforce insert/update/delete for owners/admins.

**Alternatives considered**: Pure RLS-based enforcement (rejected — role hierarchy logic is too complex for RLS expressions; server actions provide clearer validation).

## R-004: Invitation Expiration

**Decision**: 7-day expiration with cleanup via a simple check at query time (filter out expired invitations). No cron job needed.

**Rationale**: Filtering expired invitations at query time is the simplest approach. A periodic cleanup can be added later if the table grows large.

**Alternatives considered**: Cron job to delete expired rows (rejected — YAGNI, query-time filtering is sufficient). No expiration (rejected — stale invitations clutter the UI).

## R-005: Data Fetching Strategy

**Decision**: Fetch members data in the server layout and pass as props. Use React Query for client-side mutations with optimistic updates.

**Rationale**: Follows existing patterns in the codebase (dashboard-shell receives server-fetched data). React Query handles mutation state and cache invalidation.

**Alternatives considered**: Full client-side fetching (rejected — inconsistent with existing patterns, slower initial load). Server-only with full page reloads (rejected — poor UX for role changes and removals).
