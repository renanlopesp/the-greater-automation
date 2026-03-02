import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useNotificationPreferences } from '@/hooks/use-notification-preferences'

vi.mock('@/lib/actions/notifications', () => ({
  getNotificationPreferences: vi.fn().mockResolvedValue({
    preferences: {
      id: 'pref-1',
      user_id: 'u1',
      email_enabled: true,
      failures_enabled: false,
      digest_enabled: true,
      created_at: '2026-02-17T10:00:00Z',
      updated_at: '2026-02-17T10:00:00Z',
    },
  }),
  updateNotificationPreferences: vi.fn().mockResolvedValue({}),
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

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches preferences on mount', async () => {
    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.preferences.emailEnabled).toBe(true)
    expect(result.current.preferences.failuresEnabled).toBe(false)
    expect(result.current.preferences.digestEnabled).toBe(true)
  })

  it('returns defaults while loading', () => {
    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: createWrapper(),
    })

    // Default values before data loads
    expect(result.current.preferences.emailEnabled).toBe(true)
    expect(result.current.preferences.failuresEnabled).toBe(true)
    expect(result.current.preferences.digestEnabled).toBe(true)
  })

  it('exposes updatePreference function', async () => {
    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(typeof result.current.updatePreference).toBe('function')
  })
})
