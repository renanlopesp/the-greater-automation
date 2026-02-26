import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NotificationsPopover from '@/components/workflow-editor/notifications-popover'

// Mock hooks
vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: vi.fn().mockReturnValue({
    notifications: [
      {
        id: '1',
        type: 'workflow_published',
        title: 'Workflow published',
        message: 'Your workflow "Test" was published.',
        read: false,
        created_at: '2026-02-17T10:00:00Z',
      },
      {
        id: '2',
        type: 'workflow_run_completed',
        title: 'Run completed',
        message: 'Workflow "Daily" completed.',
        read: true,
        created_at: '2026-02-17T08:00:00Z',
      },
    ],
    isLoading: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    isMarkingAllRead: false,
  }),
  useUnreadNotificationCount: vi.fn().mockReturnValue({
    count: 1,
  }),
}))

vi.mock('@/lib/utils/format-relative-time', () => ({
  formatRelativeTime: vi.fn().mockReturnValue('2 hours ago'),
}))

describe('NotificationsPopover', () => {
  it('renders children as trigger', () => {
    render(
      <NotificationsPopover>
        <button>Open</button>
      </NotificationsPopover>
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })

  it('shows unread dot indicator when there are unread notifications', () => {
    const { container } = render(
      <NotificationsPopover>
        <button>Open</button>
      </NotificationsPopover>
    )
    expect(container.querySelector('.bg-destructive.rounded-full')).toBeInTheDocument()
  })

  it('renders without crashing when no unread', async () => {
    const { useUnreadNotificationCount } = await import('@/hooks/use-notifications')
    vi.mocked(useUnreadNotificationCount).mockReturnValue({ count: 0 })

    render(
      <NotificationsPopover>
        <button>Open</button>
      </NotificationsPopover>
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })
})
