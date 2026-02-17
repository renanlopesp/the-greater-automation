# Technical Plan: Notification System

**Feature ID**: 023-notifications
**Created**: 2026-02-17
**Status**: Draft

## 1. Architecture Overview

The notification system uses a **server-driven, real-time architecture** with Supabase as the source of truth. The key components are:

- **Database Layer**: Two tables (`notifications`, `notification_preferences`) with RLS policies
- **Server Actions**: CRUD operations for notifications and preferences (Next.js Server Actions)
- **Real-time Layer**: Supabase Realtime subscriptions for live updates
- **Client Layer**: React hooks (`useNotifications`, `useNotificationPreferences`) and UI components
- **Event Integration**: Auto-create notifications on workflow publish, unpublish, run complete, run fail

### Data Flow

1. **Notification Creation**: Server action → Insert into `notifications` table → Supabase Realtime broadcasts to all subscribed clients
2. **Notification Read**: Client subscribes via `useNotifications` hook → Receives initial data + real-time updates → Renders in `NotificationsPopover`
3. **Mark as Read**: User clicks → Server action updates `read` field → Realtime broadcasts update → UI updates badge count
4. **Preferences**: User toggles setting → Server action updates `notification_preferences` → Client reads preferences before creating notifications

### Component Hierarchy

```
dashboard-shell.tsx
├── NotificationsPopover (bell icon + popover)
│   ├── useNotifications (hook)
│   └── NotificationItem (map)

settings/notifications/page.tsx
└── NotificationsSection
    └── useNotificationPreferences (hook)
```

---

## 2. Data Model

### Table: `notifications`

| Column      | Type                     | Constraints                             | Description                                                                             |
| ----------- | ------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------- |
| id          | uuid                     | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique notification ID                                                                  |
| user_id     | uuid                     | NOT NULL, REFERENCES auth.users(id)     | Owner of the notification                                                               |
| team_id     | uuid                     | NULL, REFERENCES teams(id)              | Associated team (optional)                                                              |
| workflow_id | uuid                     | NULL, REFERENCES agent_workflows(id)    | Associated workflow (optional)                                                          |
| type        | text                     | NOT NULL                                | Event type: "workflow_published", "workflow_unpublished", "run_completed", "run_failed" |
| title       | text                     | NOT NULL                                | Notification title                                                                      |
| message     | text                     | NOT NULL                                | Notification message                                                                    |
| read        | boolean                  | NOT NULL, DEFAULT false                 | Read status                                                                             |
| created_at  | timestamp with time zone | NOT NULL, DEFAULT now()                 | Creation timestamp                                                                      |

**Indexes**:

- `idx_notifications_user_id` on `user_id`
- `idx_notifications_created_at` on `created_at DESC`
- `idx_notifications_read` on `read`

**RLS Policies**:

- `SELECT`: Users can view their own notifications (`user_id = auth.uid()`)
- `UPDATE`: Users can update their own notifications (`user_id = auth.uid()`)
- `INSERT`: Service role only (server actions use service role client)
- `DELETE`: No direct delete (admin only via service role)

**Realtime**:

- Enable realtime on `notifications` table
- Clients filter by `user_id = auth.uid()` to receive only their notifications

---

### Table: `notification_preferences`

| Column            | Type                     | Constraints                            | Description                          |
| ----------------- | ------------------------ | -------------------------------------- | ------------------------------------ |
| user_id           | uuid                     | PRIMARY KEY, REFERENCES auth.users(id) | Owner of preferences                 |
| email_enabled     | boolean                  | NOT NULL, DEFAULT true                 | Send email notifications             |
| failures_enabled  | boolean                  | NOT NULL, DEFAULT true                 | Notify on workflow run failures      |
| successes_enabled | boolean                  | NOT NULL, DEFAULT true                 | Notify on workflow run successes     |
| publishes_enabled | boolean                  | NOT NULL, DEFAULT true                 | Notify on workflow publish/unpublish |
| digest_enabled    | boolean                  | NOT NULL, DEFAULT false                | Send daily digest email (future)     |
| created_at        | timestamp with time zone | NOT NULL, DEFAULT now()                | Creation timestamp                   |
| updated_at        | timestamp with time zone | NOT NULL, DEFAULT now()                | Last update timestamp                |

**RLS Policies**:

- `SELECT`: Users can view their own preferences (`user_id = auth.uid()`)
- `UPDATE`: Users can update their own preferences (`user_id = auth.uid()`)
- `INSERT`: Users can create their own preferences (`user_id = auth.uid()`)

---

## 3. API Contracts

### Server Actions (`src/actions/notifications.ts`)

#### `getNotifications()`

**Purpose**: Fetch notifications for the current user, ordered by newest first, limited to 50.

**Authorization**: Requires authenticated user.

**Returns**:

```typescript
{
  data: Notification[] | null;
  error: string | null;
}
```

**Implementation**:

```typescript
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50)
```

---

#### `markAsRead(notificationId: string)`

**Purpose**: Mark a single notification as read.

**Authorization**: Requires authenticated user + notification ownership.

**Returns**:

```typescript
{
  success: boolean
  error: string | null
}
```

**Implementation**:

```typescript
const { error } = await supabase
  .from('notifications')
  .update({ read: true })
  .eq('id', notificationId)
  .eq('user_id', userId)
```

---

#### `markAllAsRead()`

**Purpose**: Mark all notifications as read for the current user.

**Authorization**: Requires authenticated user.

**Returns**:

```typescript
{
  success: boolean
  error: string | null
}
```

**Implementation**:

```typescript
const { error } = await supabase
  .from('notifications')
  .update({ read: true })
  .eq('user_id', userId)
  .eq('read', false)
```

---

#### `createNotification(params: CreateNotificationParams)`

**Purpose**: Create a new notification. Called by server-side event handlers.

**Authorization**: Internal use only (service role client).

**Params**:

```typescript
{
  userId: string;
  teamId?: string;
  workflowId?: string;
  type: 'workflow_published' | 'workflow_unpublished' | 'run_completed' | 'run_failed';
  title: string;
  message: string;
}
```

**Returns**:

```typescript
{
  success: boolean
  error: string | null
}
```

**Implementation**:

- Check user preferences before creating notification
- If preference is disabled for the event type, skip creation
- Use service role client to bypass RLS

---

#### `getNotificationPreferences()`

**Purpose**: Fetch notification preferences for the current user.

**Authorization**: Requires authenticated user.

**Returns**:

```typescript
{
  data: NotificationPreference | null
  error: string | null
}
```

**Implementation**:

```typescript
const { data, error } = await supabase
  .from('notification_preferences')
  .select('*')
  .eq('user_id', userId)
  .single()
```

**Note**: If no row exists, create default preferences.

---

#### `updateNotificationPreferences(preferences: Partial<NotificationPreference>)`

**Purpose**: Update notification preferences for the current user.

**Authorization**: Requires authenticated user.

**Returns**:

```typescript
{
  success: boolean
  error: string | null
}
```

**Implementation**:

```typescript
const { error } = await supabase.from('notification_preferences').upsert({
  user_id: userId,
  ...preferences,
  updated_at: new Date().toISOString(),
})
```

---

## 4. Component Architecture

### `NotificationsPopover` (upgraded from mock)

**Location**: `src/components/notifications-popover.tsx`

**Current State**: Mock component with hardcoded data.

**Upgrade Plan**:

- Replace mock data with `useNotifications()` hook
- Wire up "Mark all as read" button to `markAllAsRead()` action
- Wire up individual notification clicks to `markAsRead()` action
- Add loading/error states
- Add empty state ("No notifications")

**Props**: None (uses hook internally)

**State**:

- `notifications` (from hook)
- `unreadCount` (computed from notifications)
- `isLoading` (from hook)
- `error` (from hook)

**Behavior**:

- Show unread badge if `unreadCount > 0`
- Sort notifications by `created_at DESC`
- Format timestamps as relative ("2 hours ago", "5 hours ago")
- Limit to 50 notifications

---

### `useNotifications` Hook

**Location**: `src/hooks/use-notifications.ts`

**Purpose**: Fetch notifications with Supabase Realtime subscription.

**Returns**:

```typescript
{
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}
```

**Implementation**:

1. Fetch initial notifications via `getNotifications()` server action
2. Subscribe to Realtime changes on `notifications` table filtered by `user_id`
3. On INSERT event, prepend new notification to state
4. On UPDATE event, update notification in state
5. Compute `unreadCount` from `notifications.filter(n => !n.read).length`
6. Provide `markAsRead` and `markAllAsRead` helpers

**Realtime Subscription**:

```typescript
supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Handle INSERT, UPDATE, DELETE
    }
  )
  .subscribe()
```

---

### `NotificationsSection` (settings upgrade)

**Location**: `src/app/(app)/settings/notifications/page.tsx`

**Current State**: Mock section with hardcoded toggles.

**Upgrade Plan**:

- Replace mock state with `useNotificationPreferences()` hook
- Wire up toggles to `updateNotificationPreferences()` action
- Add loading/error states
- Show success toast on save

**Form Fields**:

- Email notifications (toggle)
- Workflow run failures (toggle)
- Workflow run successes (toggle)
- Workflow publishes (toggle)
- Daily digest (toggle, disabled with "Coming soon" tooltip)

---

### `useNotificationPreferences` Hook

**Location**: `src/hooks/use-notification-preferences.ts`

**Purpose**: Fetch and update notification preferences.

**Returns**:

```typescript
{
  preferences: NotificationPreference | null
  isLoading: boolean
  error: string | null
  updatePreferences: (updates: Partial<NotificationPreference>) => Promise<void>
}
```

**Implementation**:

1. Fetch preferences via `getNotificationPreferences()` server action
2. If no preferences exist, create default row
3. Provide `updatePreferences` helper that calls `updateNotificationPreferences()` action

---

## 5. Supabase Realtime Integration

### Realtime Configuration

**Enable Realtime on Tables**:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**Client Subscription** (in `useNotifications` hook):

```typescript
const channel = supabase
  .channel('user-notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      setNotifications((prev) => [payload.new as Notification, ...prev])
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
      )
    }
  )
  .subscribe()
```

**Cleanup**: Unsubscribe on unmount.

---

## 6. Event Integration Points

### Workflow Published

**Trigger**: When a workflow status changes from "draft" to "published".

**Location**: Workflow publish server action.

**Implementation**:

```typescript
await createNotification({
  userId: workflow.created_by,
  teamId: workflow.team_id,
  workflowId: workflow.id,
  type: 'workflow_published',
  title: 'Workflow published',
  message: `${workflow.name} is now live`,
})
```

---

### Workflow Unpublished

**Trigger**: When a workflow status changes from "published" to "draft".

**Location**: Workflow unpublish server action.

**Implementation**:

```typescript
await createNotification({
  userId: workflow.created_by,
  teamId: workflow.team_id,
  workflowId: workflow.id,
  type: 'workflow_unpublished',
  title: 'Workflow unpublished',
  message: `${workflow.name} is now in draft`,
})
```

---

### Workflow Run Completed

**Trigger**: When a workflow run finishes with status "completed".

**Location**: Workflow run completion handler (webhook runner or agent executor).

**Implementation**:

```typescript
await createNotification({
  userId: workflow.created_by,
  teamId: workflow.team_id,
  workflowId: workflow.id,
  type: 'run_completed',
  title: 'Workflow run completed',
  message: `${workflow.name} finished successfully`,
})
```

---

### Workflow Run Failed

**Trigger**: When a workflow run finishes with status "failed".

**Location**: Workflow run failure handler.

**Implementation**:

```typescript
await createNotification({
  userId: workflow.created_by,
  teamId: workflow.team_id,
  workflowId: workflow.id,
  type: 'run_failed',
  title: 'Workflow run failed',
  message: `${workflow.name} encountered an error`,
})
```

---

## 7. Testing Strategy

### Unit Tests

**Targets**:

- `useNotifications` hook (mocked Supabase client)
- `useNotificationPreferences` hook (mocked Supabase client)
- `NotificationsPopover` component (mocked hook)
- `NotificationsSection` component (mocked hook)
- Server actions (mocked Supabase client)

**Tools**: Vitest + @testing-library/react + happy-dom

**Key Scenarios**:

- Hook fetches notifications and computes unread count
- Hook subscribes to Realtime and updates state on INSERT
- Hook marks notification as read and updates state
- Component renders empty state when no notifications
- Component renders unread badge when unread notifications exist
- Component calls `markAllAsRead` on button click

---

### E2E Tests

**Targets**:

- Notification popover interaction (click bell, view notifications, mark all as read)
- Settings page (toggle preferences, persist changes)
- Real-time updates (trigger event in one tab, verify notification appears in another)

**Tools**: Playwright (chromium)

**Test Files**:

- `e2e/notifications-popover.spec.ts`
- `e2e/notifications-settings.spec.ts`
- `e2e/notifications-realtime.spec.ts`

**Key Scenarios**:

- User publishes workflow → notification appears in popover
- User clicks "Mark all as read" → badge disappears
- User toggles "Workflow run failures" → preference persists on reload
- User has two tabs → notification appears in both tabs in real-time

---

## 8. Migration Path

### Existing Components to Upgrade

1. **`src/components/notifications-popover.tsx`**: Replace mock data with `useNotifications` hook
2. **`src/app/(app)/settings/notifications/page.tsx`**: Replace mock state with `useNotificationPreferences` hook

### New Files to Create

1. `supabase/migrations/XXX_create_notifications_table.sql`
2. `supabase/migrations/XXX_create_notification_preferences_table.sql`
3. `supabase/migrations/XXX_enable_notifications_realtime.sql`
4. `src/actions/notifications.ts`
5. `src/hooks/use-notifications.ts`
6. `src/hooks/use-notification-preferences.ts`
7. `src/types/notification.ts` (type definitions)

### No Breaking Changes

All changes are additive — no existing functionality is removed or modified.

---

## 9. Dependencies

- **Supabase**: `@supabase/ssr`, `@supabase/supabase-js`
- **React Query**: Not needed (using Server Actions + Realtime)
- **Date Formatting**: `date-fns` (for relative timestamps like "2 hours ago")

---

## 10. Open Questions

- **Q**: Should notifications link to the workflow/run detail page?
  **A**: Yes, add a `href` prop to `NotificationItem` that links to `/workflows/{id}` or `/workflows/{id}/runs/{runId}`.

- **Q**: Should we batch Realtime updates to avoid UI flicker?
  **A**: No, Realtime updates are infrequent enough that individual updates are fine.

- **Q**: Should we show a toast when a new notification arrives?
  **A**: No, the unread badge is sufficient.

- **Q**: Should we auto-dismiss notifications after a certain time?
  **A**: No, let the user dismiss them manually.

---

## 11. Success Criteria (from Spec)

- **SC-001**: Notifications appear in the popover within 2 seconds of the triggering event ✓
- **SC-002**: Unread badge count accurately reflects the number of unread notifications ✓
- **SC-003**: "Mark all as read" clears all unread notifications in under 500ms ✓
- **SC-004**: Notification preferences persist across page reloads ✓
- **SC-005**: All unit tests pass (hooks, components, server actions) ✓
- **SC-006**: All E2E tests pass (popover interaction, settings, real-time) ✓
