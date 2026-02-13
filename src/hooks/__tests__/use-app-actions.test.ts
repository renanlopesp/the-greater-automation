import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock React Query
const mockUseQuery = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}))

// Mock the server action - return a simple mock function
vi.mock('@/lib/composio/actions/get-app-actions', () => ({
  getAppActions: vi.fn(),
}))

describe('useAppActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes correct queryKey with appId', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })

    const { useAppActions } = await import('../use-app-actions')
    useAppActions('github')

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['app-actions', 'github'],
      })
    )
  })

  it('sets enabled=false when appId is null', async () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false })

    const { useAppActions } = await import('../use-app-actions')
    useAppActions(null)

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    )
  })

  it('sets enabled=true when appId is provided', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })

    const { useAppActions } = await import('../use-app-actions')
    useAppActions('github')

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    )
  })

  it('sets staleTime to 5 minutes', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })

    const { useAppActions } = await import('../use-app-actions')
    useAppActions('github')

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 300000, // 5 * 60_000
      })
    )
  })
})
