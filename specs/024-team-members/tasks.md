# Tasks: Team Members Management

**Input**: Design documents from `/specs/024-team-members/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests included (project uses Vitest + @testing-library/react).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and RLS fix — foundation for all member features

- [ ] T001 Create `team_invitations` table migration with RLS policies via Supabase MCP `apply_migration` (see data-model.md for schema)
- [ ] T002 Fix `team_members` SELECT RLS policy to allow viewing all members of the same team (replace `user_id = auth.uid()` with co-membership subquery)
- [ ] T003 Apply migrations to both test (`ejqumzvclfkbbzzdvmmi`) and production (`djohaxwfketlsjurwqne`) databases

**Checkpoint**: Database ready — `team_invitations` table exists, team members can see each other

---

## Phase 2: Foundational (Data Layer)

**Purpose**: Server actions and query functions that ALL user stories depend on

- [ ] T004 [P] Create query functions in `src/lib/queries/members.ts` — `fetchTeamMembers` (join team_members + profiles), `fetchTeamInvitations`, `fetchPendingInvitationsForUser`
- [ ] T005 [P] Add `TeamMember` and `TeamInvitation` types to `src/types/navigation.ts`
- [ ] T006 Update `src/components/dashboard-shell.tsx` to pass `currentUserRole` prop to SettingsDialog (derive from real team_members data)
- [ ] T007 Update layout data fetching to fetch real team members from Supabase and pass to `dashboard-shell.tsx` (replace hardcoded members array)

**Checkpoint**: Real members data flows from DB → layout → dashboard-shell → SettingsDialog

---

## Phase 3: User Story 1 — View Team Members (Priority: P1) MVP

**Goal**: Display all team members with real data, avatars, roles in Settings > Members

**Independent Test**: Open Settings > Members and see all real team members with correct info

### Implementation for User Story 1

- [ ] T008 [US1] Rewrite `src/components/settings/members-section.tsx` — accept real `TeamMember[]` data, show avatar (with AvatarImage), name, email, role badge, loading skeleton
- [ ] T009 [US1] Update `src/components/settings/settings-dialog.tsx` — pass `currentUserRole` and real members data to MembersSection
- [ ] T010 [US1] Add empty state for when team has no other members (only the owner)

### Tests for User Story 1

- [ ] T011 [P] [US1] Unit test `src/components/settings/__tests__/members-section.test.tsx` — renders members list, shows avatars, role badges, loading state, empty state

**Checkpoint**: Settings > Members shows real team data from the database

---

## Phase 4: User Story 2 — Invite New Members (Priority: P1)

**Goal**: Owners/admins can invite members by email with role selection

**Independent Test**: Click "Invite member", enter email + role, submit, see pending invitation in list

### Implementation for User Story 2

- [ ] T012 [US2] Create `src/lib/actions/members.ts` — `inviteMemberAction` server action (validate email, check duplicates, check existing user, create invitation or add directly)
- [ ] T013 [US2] Create `src/components/settings/invite-member-dialog.tsx` — Dialog with email input, role Select (admin/member), submit button, loading state, error display
- [ ] T014 [US2] Update `src/components/settings/members-section.tsx` — add "Invite member" button (visible only to owners/admins), integrate InviteMemberDialog, show pending invitations section with "Pending" badge
- [ ] T015 [US2] Create notification for invited user when they already have an account — use existing notification system (Feature 023)

### Tests for User Story 2

- [ ] T016 [P] [US2] Unit test `src/lib/actions/__tests__/members.test.ts` — `inviteMemberAction`: valid invite, duplicate member, duplicate pending invite, existing user direct add, non-owner/admin rejection, invalid email
- [ ] T017 [P] [US2] Unit test `src/components/settings/__tests__/invite-member-dialog.test.tsx` — renders form, validates email, submits, shows errors, role selection

**Checkpoint**: Invite flow works end-to-end — invitation created in DB, shown in members list

---

## Phase 5: User Story 3 — Accept/Decline Invitations (Priority: P1)

**Goal**: Invited users can see and respond to pending team invitations

**Independent Test**: Log in as invited user, see invitation banner, accept/decline it

### Implementation for User Story 3

- [ ] T018 [US3] Create `acceptInvitationAction` and `declineInvitationAction` in `src/lib/actions/members.ts`
- [ ] T019 [US3] Create `src/components/settings/pending-invitations-banner.tsx` — banner component showing pending invitations with Accept/Decline buttons
- [ ] T020 [US3] Integrate pending invitations banner into dashboard layout (fetch via `fetchPendingInvitationsForUser`)

### Tests for User Story 3

- [ ] T021 [P] [US3] Unit test for `acceptInvitationAction` and `declineInvitationAction` in `src/lib/actions/__tests__/members.test.ts` — accept success, decline success, expired invite, invalid invite

**Checkpoint**: Full invite cycle works — invite → accept/decline → member added/invite removed

---

## Phase 6: User Story 4 — Manage Member Roles (Priority: P2)

**Goal**: Team owners can change member roles via dropdown

**Independent Test**: As owner, click role badge, change from "member" to "admin", verify role updates

### Implementation for User Story 4

- [ ] T022 [US4] Create `updateMemberRoleAction` in `src/lib/actions/members.ts` — verify owner, prevent self-change, update role
- [ ] T023 [US4] Update `src/components/settings/members-section.tsx` — add role dropdown (DropdownMenu) for owners, disabled for non-owners and self, optimistic update

### Tests for User Story 4

- [ ] T024 [P] [US4] Unit test for `updateMemberRoleAction` — owner changes role, non-owner rejected, self-change rejected
- [ ] T025 [P] [US4] Unit test for role dropdown in members-section — dropdown visible for owner, hidden for non-owner, disabled for self

**Checkpoint**: Owner can change member roles with immediate feedback

---

## Phase 7: User Story 5 — Remove Members (Priority: P2)

**Goal**: Owners/admins can remove members with confirmation and role hierarchy

**Independent Test**: As owner, click remove on a member, confirm, verify member disappears

### Implementation for User Story 5

- [ ] T026 [US5] Create `removeMemberAction` in `src/lib/actions/members.ts` — verify permissions, enforce role hierarchy, delete member
- [ ] T027 [US5] Update `src/components/settings/members-section.tsx` — add remove button with confirmation AlertDialog, hide for owner row, respect role hierarchy for visibility

### Tests for User Story 5

- [ ] T028 [P] [US5] Unit test for `removeMemberAction` — owner removes member, admin removes member, admin can't remove admin, can't remove owner, last owner protection
- [ ] T029 [P] [US5] Unit test for remove button visibility — hidden for owner, hidden for admin when target is admin/owner

**Checkpoint**: Members can be removed with proper role-based restrictions

---

## Phase 8: User Story 6 — Cancel Pending Invitations (Priority: P3)

**Goal**: Owners/admins can cancel pending invitations

**Independent Test**: As owner, cancel a pending invite, verify it disappears from the list

### Implementation for User Story 6

- [ ] T030 [US6] Create `cancelInvitationAction` in `src/lib/actions/members.ts`
- [ ] T031 [US6] Update pending invitations display in `src/components/settings/members-section.tsx` — add "Cancel" button on pending invitation rows

### Tests for User Story 6

- [ ] T032 [P] [US6] Unit test for `cancelInvitationAction` — cancel success, non-owner/admin rejected, already accepted invite

**Checkpoint**: Full invitation lifecycle complete — invite, accept/decline, cancel

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T033 Run `bun run build` and fix any TypeScript errors
- [ ] T034 Run `bun run lint` and fix any lint warnings
- [ ] T035 Run full test suite (`bun run vitest run`) and ensure all tests pass (existing + new)
- [ ] T036 Visual verification in browser — test all flows (view, invite, accept, role change, remove, cancel)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (migration must be applied first)
- **Phase 3 (US1 - View Members)**: Depends on Phase 2
- **Phase 4 (US2 - Invite)**: Depends on Phase 2 + Phase 3 (needs members UI)
- **Phase 5 (US3 - Accept/Decline)**: Depends on Phase 4 (needs invitations to exist)
- **Phase 6 (US4 - Roles)**: Depends on Phase 3 (needs members list)
- **Phase 7 (US5 - Remove)**: Depends on Phase 3 (needs members list)
- **Phase 8 (US6 - Cancel)**: Depends on Phase 4 (needs invitation flow)
- **Phase 9 (Polish)**: Depends on all previous phases

### Parallel Opportunities

- **Phase 2**: T004 and T005 can run in parallel
- **Phase 4 + Phase 6 + Phase 7**: After Phase 3, US4 (roles) and US5 (remove) can run in parallel with US2 (invite)
- **Tests**: All test tasks marked [P] can run in parallel with other [P] tasks in the same phase

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1: Database migration + RLS fix
2. Phase 2: Data layer + real data flow
3. Phase 3: View members (US1) — **first usable feature**
4. Phase 4: Invite members (US2) — **core value**
5. **STOP and VALIDATE**: Members list + invite flow working

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (View) → Test → real members visible
3. US2 (Invite) → Test → can add people
4. US3 (Accept/Decline) → Test → invite cycle complete
5. US4 (Roles) + US5 (Remove) → Test → full management
6. US6 (Cancel) → Test → polish
7. Polish → Build + Lint + Full test suite

---

## Summary

- **Total tasks**: 36
- **US1 (View Members)**: 4 tasks
- **US2 (Invite)**: 6 tasks
- **US3 (Accept/Decline)**: 4 tasks
- **US4 (Roles)**: 4 tasks
- **US5 (Remove)**: 4 tasks
- **US6 (Cancel)**: 3 tasks
- **Setup + Foundational**: 7 tasks
- **Polish**: 4 tasks
- **Parallel opportunities**: 12 tasks can run in parallel
- **MVP scope**: Phases 1-4 (US1 + US2 = view + invite)
