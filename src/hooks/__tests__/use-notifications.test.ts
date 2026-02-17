import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useNotifications, useUnreadNotificationCount } from '@/hooks/use-notifications'

// Mock server actions
vi.mock('@/lib/actions/notifications', () => ({
  getNotifications: vi.fn().mockResolvedValue({
    notifications: [
      {
        id: '1',
        user_id: 'u1',
        team_id: 't1',
        workflow_id: 'w1',
        type: 'workflow_published',
        title: 'Workflow published',
        message: 'Your workflow "Test" was published.',
        read: false,
        created_at: '2026-02-17T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'u1',
        team_id: 't1',
        workflow_id: 'w2',
        type: 'workflow_run_completed',
        title: 'Workflow run completed',
        message: 'Workflow "Daily" completed.',
        read: true,
        created_at: '2026-02-17T08:00:00Z',
      },
    ],
  }),
  getUnreadCount: vi.fn().mockResolvedValue({ count: 1 }),
  markAsRead: vi.fn().mockResolvedValue({}),
  markAllAsRead: vi.fn().mockResolvedValue({}),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
  return Wrapper
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches notifications on mount', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2)
    })

    expect(result.current.notifications[0].title).toBe('Workflow published')
    expect(result.current.notifications[1].title).toBe('Workflow run completed')
  })

  it('returns empty array while loading', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    expect(result.current.notifications).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it('exposes markAsRead function', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2)
    })

    expect(typeof result.current.markAsRead).toBe('function')
    expect(typeof result.current.markAllAsRead).toBe('function')
  })
})

describe('useUnreadNotificationCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches unread count', async () => {
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })

  it('defaults to 0 while loading', () => {
    const { result } = renderHook(() => useUnreadNotificationCount(), {
      wrapper: createWrapper(),
    })

    expect(result.current.count).toBe(0)
  })
})
