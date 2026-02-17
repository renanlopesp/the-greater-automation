# Feature Specification: Notification System

**Feature ID**: 023-notifications
**Created**: 2026-02-17
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Workflow Notifications in Editor (Priority: P1)

As a user editing a workflow, I want to see real-time notifications about workflow events (published, run completed, run failed) in a popover dropdown, so I stay informed without leaving the editor.

**Why this priority**: Core functionality — workflow notifications are the most frequently triggered and most immediately useful to the user.

**Independent Test**: Can be tested by publishing a workflow or completing a run and verifying the notification appears in the popover.

**Acceptance Scenarios**:

1. **Given** I am in the workflow editor, **When** I click the bell icon, **Then** I see a popover with my notifications sorted by newest first
2. **Given** a workflow is published, **When** the publish completes, **Then** a "Workflow published" notification is created and appears in the popover
3. **Given** a workflow run completes, **When** the run finishes, **Then** a "Workflow run completed/failed" notification appears
4. **Given** I have unread notifications, **When** I view the bell icon, **Then** I see an unread count badge
5. **Given** I have unread notifications, **When** I click "Mark all as read", **Then** all notifications are marked as read and the badge disappears

---

### User Story 2 - General Notifications in Dashboard (Priority: P1)

As a user on the dashboard, I want to see notifications about all my workflows and workspace activity, so I have a centralized view of what's happening.

**Why this priority**: Dashboard is the entry point — users need notifications here too.

**Independent Test**: Can be tested by navigating to dashboard and verifying notifications appear from the bell icon.

**Acceptance Scenarios**:

1. **Given** I am on the dashboard, **When** I click the bell icon, **Then** I see the same notification popover with all my notifications
2. **Given** I have unread notifications, **When** I view the dashboard, **Then** the bell icon shows an unread count badge
3. **Given** I click a notification, **When** the notification is for a specific workflow, **Then** I can identify which workflow it relates to

---

### User Story 3 - Real-time Notification Updates (Priority: P2)

As a user, I want notifications to appear in real-time without refreshing the page, so I'm always up to date.

**Why this priority**: Real-time is important for UX but the system works without it (manual refresh).

**Independent Test**: Can be tested by having two tabs open — trigger event in one, see notification appear in the other.

**Acceptance Scenarios**:

1. **Given** I have the notification popover open, **When** a new notification is created, **Then** it appears at the top without page refresh
2. **Given** I have the popover closed, **When** a new notification arrives, **Then** the unread count badge updates automatically

---

### User Story 4 - Notification Preferences (Priority: P2)

As a user, I want to configure which notifications I receive, so I only get notified about things I care about.

**Why this priority**: Settings are secondary to the core notification flow.

**Independent Test**: Can be tested by toggling preferences in settings and verifying notification behavior changes.

**Acceptance Scenarios**:

1. **Given** I am in Settings > Notifications, **When** I toggle a preference, **Then** the change is persisted to the database
2. **Given** I have disabled "Workflow run failures", **When** a workflow fails, **Then** no notification is created for that event
3. **Given** I reload the settings page, **When** I view notification preferences, **Then** my saved preferences are shown

---

### User Story 5 - Mark Individual Notification as Read (Priority: P3)

As a user, I want to mark individual notifications as read by clicking on them, so I can track which ones I've already seen.

**Why this priority**: Nice to have — "Mark all as read" covers the basic need.

**Independent Test**: Can be tested by clicking an unread notification and verifying it becomes read.

**Acceptance Scenarios**:

1. **Given** I have an unread notification, **When** I click on it, **Then** it is marked as read and the unread dot disappears
2. **Given** all notifications are read, **When** I view the popover, **Then** no unread badge is shown

---

### Edge Cases

- What happens when there are 0 notifications? Show empty state with bell icon and "No notifications" text
- What happens when there are 100+ notifications? Paginate or limit to most recent 50
- What happens when Supabase Realtime connection drops? Gracefully degrade — show stale data, reconnect
- What happens when user is on multiple tabs? All tabs update via Realtime subscription
- What happens when a workflow is deleted? Associated notifications remain but link is disabled

## Requirements

### Functional Requirements

- **FR-001**: System MUST store notifications in a `notifications` Supabase table with RLS
- **FR-002**: System MUST create notifications on workflow events: published, unpublished, run completed, run failed
- **FR-003**: System MUST display notifications in a popover (workflow editor header + dashboard)
- **FR-004**: Users MUST be able to mark all notifications as read
- **FR-005**: Users MUST be able to mark individual notifications as read
- **FR-006**: System MUST show unread notification count as a badge on the bell icon
- **FR-007**: System MUST update notifications in real-time via Supabase Realtime
- **FR-008**: System MUST persist notification preferences in a `notification_preferences` table
- **FR-009**: System MUST respect notification preferences when creating notifications
- **FR-010**: System MUST show relative timestamps (e.g., "2 hours ago", "5 hours ago")
- **FR-011**: System MUST limit displayed notifications to 50 most recent

### Key Entities

- **Notification**: Represents a single notification event (id, user_id, team_id, workflow_id, type, title, message, read, created_at)
- **NotificationPreference**: Represents user notification settings (user_id, email_enabled, failures_enabled, digest_enabled)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Notifications appear in the popover within 2 seconds of the triggering event
- **SC-002**: Unread badge count accurately reflects the number of unread notifications
- **SC-003**: "Mark all as read" clears all unread notifications in under 500ms
- **SC-004**: Notification preferences persist across page reloads
- **SC-005**: All unit tests pass (hooks, components, server actions)
- **SC-006**: All E2E tests pass (popover interaction, settings, real-time)
