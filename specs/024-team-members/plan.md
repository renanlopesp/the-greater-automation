# Implementation Plan: Team Members Management

**Branch**: `024-team-members` | **Date**: 2026-02-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-team-members/spec.md`

## Summary

Implement a full team members management system within the existing Settings dialog. Replace the hardcoded members array with real data from Supabase, add invite/accept/decline flow with a new `team_invitations` table, role management for owners, and member removal with role hierarchy enforcement. Fix existing RLS policy on `team_members` to allow teammates to see each other.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, shadcn/ui, @supabase/ssr, TanStack React Query, Zod
**Storage**: Supabase PostgreSQL (production: `djohaxwfketlsjurwqne`, test: `ejqumzvclfkbbzzdvmmi`)
**Testing**: Vitest + @testing-library/react + happy-dom
**Target Platform**: Web (modern browsers)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Members list loads in <1s, invite completes in <2s
**Constraints**: All data via Supabase client, RLS on all tables, no custom email service
**Scale/Scope**: Up to 50 members per team

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status | Notes                                                                           |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------- |
| I. Next.js App Router First          | PASS   | Server actions for mutations, server component for initial data fetch in layout |
| II. shadcn/ui Component System       | PASS   | Dialog, DropdownMenu, Button, Badge, Avatar, Input, Select from shadcn          |
| III. Tailwind CSS v4 + OKLCH Theming | PASS   | All styling via Tailwind utilities and CSS variable tokens                      |
| IV. TypeScript Strict Mode           | PASS   | Zod for form validation, generated DB types                                     |
| V. Simplicity and YAGNI              | PASS   | No email service, no complex permissions matrix, direct Supabase queries        |
| VI. Supabase as Backend              | PASS   | New table + RLS, server actions for mutations, Supabase client for queries      |

## Project Structure

### Documentation (this feature)

```text
specs/024-team-members/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # Server actions API
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (dashboard)/layout.tsx          # Fetch real members data
├── components/
│   └── settings/
│       ├── members-section.tsx         # Rewrite: real data, role-based UI
│       ├── invite-member-dialog.tsx    # New: invite form dialog
│       └── __tests__/
│           └── members-section.test.tsx # New: unit tests
├── lib/
│   ├── actions/
│   │   ├── members.ts                 # New: server actions (invite, remove, role change)
│   │   └── __tests__/
│   │       └── members.test.ts        # New: action unit tests
│   └── queries/
│       └── members.ts                 # New: fetch members + invitations
├── types/
│   └── navigation.ts                  # Update: add MemberData type
└── components/
    └── dashboard-shell.tsx            # Update: fetch real members

supabase/migrations/
└── YYYYMMDD_create_team_invitations.sql  # New migration
```

**Structure Decision**: Follows existing patterns — server actions in `lib/actions/`, queries in `lib/queries/`, components in `components/settings/`.

## Phases

### Phase 1: Database & RLS Fix

- Create `team_invitations` table with RLS
- Fix `team_members` SELECT RLS policy (allow viewing teammates)
- Apply migration to both test and production

### Phase 2: Data Layer

- Create server actions: `inviteMemberAction`, `acceptInvitationAction`, `declineInvitationAction`, `updateMemberRoleAction`, `removeMemberAction`, `cancelInvitationAction`
- Create query functions: `fetchTeamMembers`, `fetchTeamInvitations`, `fetchPendingInvitationsForUser`
- Update `dashboard-shell.tsx` and layout to fetch real members data

### Phase 3: UI Components

- Rewrite `members-section.tsx` with real data, role-based controls
- Create `invite-member-dialog.tsx` with email input + role select
- Add role change dropdown (owner only)
- Add remove member with confirmation dialog
- Show pending invitations with cancel option

### Phase 4: Invitation Accept/Decline Flow

- Add pending invitations query for current user
- Show invitation banner/notification on dashboard
- Accept/decline actions with immediate feedback

### Phase 5: Testing

- Unit tests for all server actions
- Unit tests for MembersSection component
- Unit tests for InviteMemberDialog component

## Complexity Tracking

No constitution violations — no tracking needed.
