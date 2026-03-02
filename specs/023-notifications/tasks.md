# Implementation Tasks: Notification System

**Feature ID**: 023-notifications
**Created**: 2026-02-17
**Status**: Draft

---

## Phase 1: Database Migrations

### Task 1.1: Create notifications table migration

**ID**: 023-T1.1
**Dependencies**: None
**Estimated Effort**: 30 minutes

**Description**:
Create a migration file to define the `notifications` table with all columns, constraints, and indexes.

**Implementation Steps**:

1. Create migration file: `supabase/migrations/XXX_create_notifications_table.sql`
2. Define table schema with columns: id, user_id, team_id, workflow_id, type, title, message, read, created_at
3. Add foreign key constraints to auth.users, teams, agent_workflows
4. Create indexes on user_id, created_at, read
5. Apply migration to test branch

**Acceptance Criteria**:

- Migration file exists and runs without errors
- Table has all required columns with correct types
- Foreign keys are enforced
- Indexes are created

---

### Task 1.2: Create notification_preferences table migration

**ID**: 023-T1.2
**Dependencies**: None
**Estimated Effort**: 20 minutes

**Description**:
Create a migration file to define the `notification_preferences` table with all columns and constraints.

**Implementation Steps**:

1. Create migration file: `supabase/migrations/XXX_create_notification_preferences_table.sql`
2. Define table schema with columns: user_id (PK), email_enabled, failures_enabled, successes_enabled, publishes_enabled, digest_enabled, created_at, updated_at
3. Add foreign key constraint to auth.users
4. Apply migration to test branch

**Acceptance Criteria**:

- Migration file exists and runs without errors
- Table has all required columns with correct types and defaults
- user_id is primary key
- Foreign key is enforced

---

### Task 1.3: Add RLS policies for notifications

**ID**: 023-T1.3
**Dependencies**: 023-T1.1
**Estimated Effort**: 30 minutes

**Description**:
Create RLS policies for the `notifications` table to ensure users can only access their own notifications.

**Implementation Steps**:

1. Create migration file: `supabase/migrations/XXX_add_notifications_rls.sql`
2. Enable RLS on notifications table
3. Add SELECT policy: `user_id = auth.uid()`
4. Add UPDATE policy: `user_id = auth.uid()`
5. No INSERT/DELETE policies (service role only)
6. Apply migration to test branch

**Acceptance Criteria**:

- RLS is enabled on notifications table
- Users can only SELECT/UPDATE their own notifications
- Service role can perform all operations

---

### Task 1.4: Add RLS policies for notification_preferences

**ID**: 023-T1.4
**Dependencies**: 023-T1.2
**Estimated Effort**: 20 minutes

**Description**:
Create RLS policies for the `notification_preferences` table.

**Implementation Steps**:

1. Create migration file: `supabase/migrations/XXX_add_notification_preferences_rls.sql`
2. Enable RLS on notification_preferences table
3. Add SELECT policy: `user_id = auth.uid()`
4. Add INSERT policy: `user_id = auth.uid()`
5. Add UPDATE policy: `user_id = auth.uid()`
6. Apply migration to test branch

**Acceptance Criteria**:

- RLS is enabled on notification_preferences table
- Users can only access their own preferences

---

### Task 1.5: Enable Realtime for notifications table

**ID**: 023-T1.5
**Dependencies**: 023-T1.1
**Estimated Effort**: 15 minutes

**Description**:
Enable Supabase Realtime on the `notifications` table so clients can subscribe to changes.

**Implementation Steps**:

1. Create migration file: `supabase/migrations/XXX_enable_notifications_realtime.sql`
2. Add notifications table to supabase_realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;`
3. Apply migration to test branch
4. Verify Realtime is enabled in Supabase dashboard

**Acceptance Criteria**:

- Realtime is enabled on notifications table
- Clients can subscribe to changes filtered by user_id

---

## Phase 2: Server Actions & Hooks

### Task 2.1: Create notification types

**ID**: 023-T2.1
**Dependencies**: 023-T1.1, 023-T1.2
**Estimated Effort**: 15 minutes

**Description**:
Define TypeScript types for notifications and preferences.

**Implementation Steps**:

1. Create file: `src/types/notification.ts`
2. Define `Notification` type matching DB schema
3. Define `NotificationPreference` type matching DB schema
4. Define `NotificationType` enum: workflow_published, workflow_unpublished, run_completed, run_failed
5. Export all types

**Acceptance Criteria**:

- Types match DB schema exactly
- No TypeScript errors in strict mode

---

### Task 2.2: Create getNotifications server action

**ID**: 023-T2.2
**Dependencies**: 023-T2.1
**Estimated Effort**: 30 minutes

**Description**:
Create server action to fetch notifications for the current user.

**Implementation Steps**:

1. Create file: `src/actions/notifications.ts`
2. Implement `getNotifications()` function
3. Use authenticated Supabase client
4. Query notifications table ordered by created_at DESC, limit 50
5. Return `{ data, error }` format

**Acceptance Criteria**:

- Function returns notifications for authenticated user only
- Results are sorted newest first
- Limit is enforced at 50
- Errors are handled gracefully

---

### Task 2.3: Create markAsRead server action

**ID**: 023-T2.3
**Dependencies**: 023-T2.1
**Estimated Effort**: 20 minutes

**Description**:
Create server action to mark a single notification as read.

**Implementation Steps**:

1. Add `markAsRead(notificationId: string)` to `src/actions/notifications.ts`
2. Update notification where id = notificationId AND user_id = auth.uid()
3. Set read = true
4. Return `{ success, error }` format

**Acceptance Criteria**:

- Function marks notification as read
- User can only mark their own notifications
- Errors are handled gracefully

---

### Task 2.4: Create markAllAsRead server action

**ID**: 023-T2.4
**Dependencies**: 023-T2.1
**Estimated Effort**: 20 minutes

**Description**:
Create server action to mark all notifications as read for the current user.

**Implementation Steps**:

1. Add `markAllAsRead()` to `src/actions/notifications.ts`
2. Update all notifications where user_id = auth.uid() AND read = false
3. Set read = true
4. Return `{ success, error }` format

**Acceptance Criteria**:

- Function marks all unread notifications as read
- Only affects current user's notifications
- Completes in under 500ms (SC-003)

---

### Task 2.5: Create createNotification server action

**ID**: 023-T2.5
**Dependencies**: 023-T2.1
**Estimated Effort**: 45 minutes

**Description**:
Create server action to create a new notification. Uses service role client to bypass RLS and checks preferences before creating.

**Implementation Steps**:

1. Add `createNotification(params: CreateNotificationParams)` to `src/actions/notifications.ts`
2. Use service role Supabase client (bypass RLS)
3. Fetch user preferences first
4. Check if notification type is enabled in preferences
5. If disabled, skip creation and return success
6. If enabled, insert notification
7. Return `{ success, error }` format

**Acceptance Criteria**:

- Function respects user preferences (FR-009)
- Uses service role client
- Validates all required params
- Errors are handled gracefully

---

### Task 2.6: Create getNotificationPreferences server action

**ID**: 023-T2.6
**Dependencies**: 023-T2.1
**Estimated Effort**: 30 minutes

**Description**:
Create server action to fetch notification preferences for the current user.

**Implementation Steps**:

1. Add `getNotificationPreferences()` to `src/actions/notifications.ts`
2. Use authenticated Supabase client
3. Query notification_preferences table where user_id = auth.uid()
4. If no row exists, create default preferences (all enabled except digest)
5. Return `{ data, error }` format

**Acceptance Criteria**:

- Function returns preferences for current user
- Creates default preferences if none exist
- Defaults match spec (email=true, failures=true, successes=true, publishes=true, digest=false)

---

### Task 2.7: Create updateNotificationPreferences server action

**ID**: 023-T2.7
**Dependencies**: 023-T2.1
**Estimated Effort**: 20 minutes

**Description**:
Create server action to update notification preferences for the current user.

**Implementation Steps**:

1. Add `updateNotificationPreferences(preferences: Partial<NotificationPreference>)` to `src/actions/notifications.ts`
2. Use authenticated Supabase client
3. Upsert to notification_preferences table
4. Set updated_at = now()
5. Return `{ success, error }` format

**Acceptance Criteria**:

- Function updates preferences for current user
- Uses upsert to handle missing rows
- Sets updated_at timestamp
- Preferences persist across reloads (SC-004)

---

### Task 2.8: Create useNotifications hook

**ID**: 023-T2.8
**Dependencies**: 023-T2.2, 023-T2.3, 023-T2.4, 023-T1.5
**Estimated Effort**: 60 minutes

**Description**:
Create React hook to fetch notifications with Supabase Realtime subscription.

**Implementation Steps**:

1. Create file: `src/hooks/use-notifications.ts`
2. Fetch initial notifications via `getNotifications()` server action
3. Subscribe to Realtime changes on notifications table filtered by user_id
4. Handle INSERT events (prepend to state)
5. Handle UPDATE events (update in state)
6. Compute unreadCount from state
7. Provide markAsRead and markAllAsRead helpers
8. Clean up subscription on unmount

**Acceptance Criteria**:

- Hook fetches initial notifications on mount
- Hook subscribes to Realtime and updates state on INSERT/UPDATE
- unreadCount is computed correctly
- Helpers call server actions and update local state optimistically
- Subscription is cleaned up on unmount
- Notifications appear within 2 seconds (SC-001)

---

### Task 2.9: Create useNotificationPreferences hook

**ID**: 023-T2.9
**Dependencies**: 023-T2.6, 023-T2.7
**Estimated Effort**: 30 minutes

**Description**:
Create React hook to fetch and update notification preferences.

**Implementation Steps**:

1. Create file: `src/hooks/use-notification-preferences.ts`
2. Fetch preferences via `getNotificationPreferences()` server action
3. Provide updatePreferences helper that calls `updateNotificationPreferences()` action
4. Handle loading and error states
5. Return { preferences, isLoading, error, updatePreferences }

**Acceptance Criteria**:

- Hook fetches preferences on mount
- updatePreferences calls server action and updates local state
- Loading and error states are exposed
- Preferences persist across reloads (SC-004)

---

## Phase 3: UI Components

### Task 3.1: Upgrade NotificationsPopover component

**ID**: 023-T3.1
**Dependencies**: 023-T2.8
**Estimated Effort**: 60 minutes

**Description**:
Replace mock data in NotificationsPopover with real data from useNotifications hook.

**Implementation Steps**:

1. Open `src/components/notifications-popover.tsx`
2. Remove mock data
3. Import and use `useNotifications` hook
4. Wire up "Mark all as read" button to `markAllAsRead` from hook
5. Wire up individual notification clicks to `markAsRead` from hook
6. Add loading state (show skeleton)
7. Add error state (show error message)
8. Add empty state ("No notifications")
9. Compute unread badge from `unreadCount`
10. Format timestamps using `date-fns` (e.g., "2 hours ago")

**Acceptance Criteria**:

- Component fetches real data from hook
- Unread badge shows correct count (SC-002)
- "Mark all as read" button works and clears badge
- Individual notification clicks mark as read
- Loading, error, and empty states render correctly
- Timestamps are formatted as relative ("2 hours ago")

---

### Task 3.2: Add NotificationsPopover to dashboard-shell

**ID**: 023-T3.2
**Dependencies**: 023-T3.1
**Estimated Effort**: 10 minutes

**Description**:
Verify NotificationsPopover is already rendered in dashboard-shell header (it should be from the mock).

**Implementation Steps**:

1. Open `src/app/(app)/(dashboard)/dashboard-shell.tsx`
2. Verify `<NotificationsPopover />` is rendered in the header
3. If missing, add it next to the user avatar

**Acceptance Criteria**:

- NotificationsPopover is visible in dashboard header
- Bell icon is clickable and shows popover

---

### Task 3.3: Upgrade NotificationsSection in settings

**ID**: 023-T3.3
**Dependencies**: 023-T2.9
**Estimated Effort**: 45 minutes

**Description**:
Replace mock state in settings/notifications page with real data from useNotificationPreferences hook.

**Implementation Steps**:

1. Open `src/app/(app)/settings/notifications/page.tsx`
2. Remove mock state
3. Import and use `useNotificationPreferences` hook
4. Wire up toggles to `updatePreferences` from hook
5. Add loading state (show skeleton)
6. Add error state (show error message)
7. Show success toast on save using shadcn toast
8. Add "Coming soon" tooltip to digest toggle (disabled)

**Acceptance Criteria**:

- Component fetches real preferences from hook
- Toggles update preferences and persist (SC-004)
- Success toast appears on save
- Loading and error states render correctly
- Digest toggle is disabled with tooltip

---

## Phase 4: Event Integration

### Task 4.1: Add notification on workflow publish

**ID**: 023-T4.1
**Dependencies**: 023-T2.5
**Estimated Effort**: 30 minutes

**Description**:
Call `createNotification` when a workflow is published.

**Implementation Steps**:

1. Find workflow publish server action (likely in `src/actions/workflows.ts`)
2. After status update to "published", call `createNotification`
3. Pass userId, teamId, workflowId, type="workflow_published"
4. Set title="Workflow published", message="{workflow.name} is now live"

**Acceptance Criteria**:

- Notification is created on publish
- Notification appears in popover within 2 seconds (SC-001)
- Notification has correct type, title, message

---

### Task 4.2: Add notification on workflow unpublish

**ID**: 023-T4.2
**Dependencies**: 023-T2.5
**Estimated Effort**: 20 minutes

**Description**:
Call `createNotification` when a workflow is unpublished.

**Implementation Steps**:

1. Find workflow unpublish server action
2. After status update to "draft", call `createNotification`
3. Pass userId, teamId, workflowId, type="workflow_unpublished"
4. Set title="Workflow unpublished", message="{workflow.name} is now in draft"

**Acceptance Criteria**:

- Notification is created on unpublish
- Notification appears in popover within 2 seconds

---

### Task 4.3: Add notification on workflow run completed

**ID**: 023-T4.3
**Dependencies**: 023-T2.5
**Estimated Effort**: 30 minutes

**Description**:
Call `createNotification` when a workflow run completes successfully.

**Implementation Steps**:

1. Find workflow run completion handler (webhook runner or agent executor)
2. After status update to "completed", call `createNotification`
3. Pass userId, teamId, workflowId, type="run_completed"
4. Set title="Workflow run completed", message="{workflow.name} finished successfully"

**Acceptance Criteria**:

- Notification is created on run completion
- Notification appears in popover within 2 seconds
- Notification respects preferences (if successes_enabled=false, skip)

---

### Task 4.4: Add notification on workflow run failed

**ID**: 023-T4.4
**Dependencies**: 023-T2.5
**Estimated Effort**: 30 minutes

**Description**:
Call `createNotification` when a workflow run fails.

**Implementation Steps**:

1. Find workflow run failure handler
2. After status update to "failed", call `createNotification`
3. Pass userId, teamId, workflowId, type="run_failed"
4. Set title="Workflow run failed", message="{workflow.name} encountered an error"

**Acceptance Criteria**:

- Notification is created on run failure
- Notification appears in popover within 2 seconds
- Notification respects preferences (if failures_enabled=false, skip)

---

## Phase 5: Unit Tests

### Task 5.1: Unit tests for useNotifications hook

**ID**: 023-T5.1
**Dependencies**: 023-T2.8
**Estimated Effort**: 45 minutes

**Description**:
Write unit tests for useNotifications hook using Vitest + @testing-library/react.

**Test Cases**:

1. Hook fetches notifications on mount
2. Hook computes unreadCount correctly
3. Hook updates state on Realtime INSERT event
4. Hook updates state on Realtime UPDATE event
5. markAsRead calls server action and updates local state
6. markAllAsRead calls server action and updates local state
7. Hook cleans up subscription on unmount

**Implementation Steps**:

1. Create file: `src/hooks/__tests__/use-notifications.test.ts`
2. Mock Supabase client and Realtime subscription
3. Write tests using renderHook from @testing-library/react
4. Verify all test cases pass

**Acceptance Criteria**:

- All test cases pass (SC-005)
- Coverage includes happy path + error cases

---

### Task 5.2: Unit tests for useNotificationPreferences hook

**ID**: 023-T5.2
**Dependencies**: 023-T2.9
**Estimated Effort**: 30 minutes

**Description**:
Write unit tests for useNotificationPreferences hook.

**Test Cases**:

1. Hook fetches preferences on mount
2. Hook creates default preferences if none exist
3. updatePreferences calls server action and updates local state
4. Hook handles errors gracefully

**Implementation Steps**:

1. Create file: `src/hooks/__tests__/use-notification-preferences.test.ts`
2. Mock Supabase client
3. Write tests using renderHook
4. Verify all test cases pass

**Acceptance Criteria**:

- All test cases pass (SC-005)
- Default preferences match spec

---

### Task 5.3: Unit tests for NotificationsPopover component

**ID**: 023-T5.3
**Dependencies**: 023-T3.1
**Estimated Effort**: 45 minutes

**Description**:
Write unit tests for NotificationsPopover component.

**Test Cases**:

1. Component renders loading state
2. Component renders empty state when no notifications
3. Component renders notifications list
4. Component renders unread badge when unread notifications exist
5. Component hides badge when all notifications are read
6. Component calls markAllAsRead on button click
7. Component calls markAsRead on notification click

**Implementation Steps**:

1. Create file: `src/components/__tests__/notifications-popover.test.tsx`
2. Mock useNotifications hook
3. Write tests using render from @testing-library/react
4. Verify all test cases pass

**Acceptance Criteria**:

- All test cases pass (SC-005)
- Component handles all states correctly

---

### Task 5.4: Unit tests for NotificationsSection component

**ID**: 023-T5.4
**Dependencies**: 023-T3.3
**Estimated Effort**: 30 minutes

**Description**:
Write unit tests for NotificationsSection settings page.

**Test Cases**:

1. Component renders preferences from hook
2. Component updates preferences on toggle
3. Component shows success toast on save
4. Component handles errors gracefully
5. Digest toggle is disabled

**Implementation Steps**:

1. Create file: `src/app/(app)/settings/notifications/__tests__/page.test.tsx`
2. Mock useNotificationPreferences hook
3. Write tests using render
4. Verify all test cases pass

**Acceptance Criteria**:

- All test cases pass (SC-005)
- Toggles update preferences correctly

---

### Task 5.5: Unit tests for notification server actions

**ID**: 023-T5.5
**Dependencies**: 023-T2.2, 023-T2.3, 023-T2.4, 023-T2.5, 023-T2.6, 023-T2.7
**Estimated Effort**: 60 minutes

**Description**:
Write unit tests for all server actions in src/actions/notifications.ts.

**Test Cases**:

1. getNotifications returns notifications for current user
2. markAsRead marks notification as read
3. markAsRead rejects unauthorized access
4. markAllAsRead marks all unread notifications as read
5. createNotification respects user preferences
6. createNotification skips creation if preference disabled
7. getNotificationPreferences creates defaults if missing
8. updateNotificationPreferences updates and sets updated_at

**Implementation Steps**:

1. Create file: `src/actions/__tests__/notifications.test.ts`
2. Mock Supabase client (both authenticated and service role)
3. Write tests using Vitest
4. Verify all test cases pass

**Acceptance Criteria**:

- All test cases pass (SC-005)
- RLS policies are respected
- Preferences logic is correct

---

## Phase 6: E2E Tests

### Task 6.1: E2E test for notifications popover

**ID**: 023-T6.1
**Dependencies**: 023-T3.1, 023-T4.1
**Estimated Effort**: 45 minutes

**Description**:
Write E2E test for notification popover interaction using Playwright.

**Test Scenarios**:

1. User publishes workflow → notification appears in popover
2. User clicks bell icon → popover opens with notifications
3. User sees unread badge with correct count
4. User clicks "Mark all as read" → badge disappears
5. User clicks individual notification → notification is marked as read

**Implementation Steps**:

1. Create file: `e2e/notifications-popover.spec.ts`
2. Write test scenarios using Playwright
3. Seed test data (create workflow, publish it)
4. Verify notifications appear within 2 seconds (SC-001)
5. Verify badge count is accurate (SC-002)
6. Verify "Mark all as read" completes in under 500ms (SC-003)

**Acceptance Criteria**:

- All test scenarios pass (SC-006)
- Success criteria SC-001, SC-002, SC-003 are validated

---

### Task 6.2: E2E test for notification settings

**ID**: 023-T6.2
**Dependencies**: 023-T3.3
**Estimated Effort**: 30 minutes

**Description**:
Write E2E test for notification settings page using Playwright.

**Test Scenarios**:

1. User navigates to Settings > Notifications
2. User sees current preferences
3. User toggles "Workflow run failures" off
4. User reloads page → preference persists
5. User triggers workflow failure → no notification is created

**Implementation Steps**:

1. Create file: `e2e/notifications-settings.spec.ts`
2. Write test scenarios using Playwright
3. Verify preferences persist across reloads (SC-004)
4. Verify notification creation respects preferences (FR-009)

**Acceptance Criteria**:

- All test scenarios pass (SC-006)
- Success criteria SC-004 is validated

---

### Task 6.3: E2E test for real-time notifications

**ID**: 023-T6.3
**Dependencies**: 023-T3.1, 023-T4.1
**Estimated Effort**: 45 minutes

**Description**:
Write E2E test for real-time notification updates using Playwright with multiple tabs.

**Test Scenarios**:

1. User opens two browser tabs
2. In tab 1, user publishes a workflow
3. In tab 2, notification appears within 2 seconds without refresh
4. In tab 1, user marks notification as read
5. In tab 2, unread badge disappears without refresh

**Implementation Steps**:

1. Create file: `e2e/notifications-realtime.spec.ts`
2. Use Playwright's context.newPage() to create multiple tabs
3. Trigger events in one tab, verify updates in another
4. Verify real-time updates appear within 2 seconds (SC-001)

**Acceptance Criteria**:

- All test scenarios pass (SC-006)
- Real-time updates work across tabs (FR-007)
- Success criteria SC-001 is validated in multi-tab scenario

---

## Summary

**Total Tasks**: 34
**Total Estimated Effort**: ~16.5 hours

**Critical Path**:

1. Phase 1 (Migrations) → Phase 2 (Server Actions) → Phase 3 (UI Components) → Phase 4 (Event Integration) → Phase 5 (Unit Tests) → Phase 6 (E2E Tests)

**Parallel Work Opportunities**:

- Tasks 1.1, 1.2 can be done in parallel
- Tasks 1.3, 1.4, 1.5 can be done in parallel (after 1.1, 1.2)
- Tasks 2.2, 2.3, 2.4, 2.6, 2.7 can be done in parallel (after 2.1)
- Tasks 4.1, 4.2, 4.3, 4.4 can be done in parallel (after 2.5)
- Tasks 5.1, 5.2, 5.3, 5.4, 5.5 can be done in parallel (after Phase 3, 4)
- Tasks 6.1, 6.2, 6.3 can be done in parallel (after Phase 5)

**Blockers**:

- Phase 2 is blocked on Phase 1 (need DB schema)
- Phase 3 is blocked on Phase 2 (need hooks)
- Phase 4 is blocked on Phase 2 (need createNotification action)
- Phase 5 is blocked on Phase 3, 4 (need components and integrations)
- Phase 6 is blocked on Phase 5 (need unit tests passing)
