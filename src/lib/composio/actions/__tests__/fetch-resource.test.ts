import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoist mock variables so vi.mock factories can reference them
const { mockGetUser } = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  return { mockGetUser }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

// Mock global fetch for Composio REST API calls
const mockFetch = vi.fn()

import { fetchAppResource } from '../fetch-resource'

describe('fetchAppResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('COMPOSIO_API_KEY', 'test-api-key')
    vi.stubGlobal('fetch', mockFetch)
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Not authenticated',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns error when COMPOSIO_API_KEY is not set', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', '')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'COMPOSIO_API_KEY not configured',
    })
  })

  it('returns error when no connection found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    // resolveConnectionUuid returns empty items (no active connection)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'No active github connection found',
    })
    // Should have called the connectedAccounts API
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/connectedAccounts'),
      expect.objectContaining({ headers: { 'x-api-key': 'test-api-key' } })
    )
  })

  it('fetches resources and maps to ResourceItem[]', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    // resolveConnectionUuid
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid-456', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    // execute action
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successfull: true,
        data: [
          { name: 'repo-1', id: 'id-1' },
          { name: 'repo-2', id: 'id-2' },
        ],
      }),
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [
        { label: 'repo-1', value: 'id-1', raw: { name: 'repo-1', id: 'id-1' } },
        { label: 'repo-2', value: 'id-2', raw: { name: 'repo-2', id: 'id-2' } },
      ],
    })
    // Verify the execute call
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const executeCall = mockFetch.mock.calls[1]
    expect(executeCall[0]).toContain('/api/v2/actions/GITHUB_LIST_USER_REPOS/execute')
    const executeBody = JSON.parse(executeCall[1].body)
    expect(executeBody).toEqual({
      connectedAccountId: 'conn-uuid-456',
      input: {},
    })
  })

  it('uses displayField and valueField to map items', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successfull: true,
        data: [
          { full_name: 'user/repo-1', name: 'repo-1', id: 'id-1' },
          { full_name: 'user/repo-2', name: 'repo-2', id: 'id-2' },
        ],
      }),
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'full_name', 'name')

    expect(result).toEqual({
      items: [
        {
          label: 'user/repo-1',
          value: 'repo-1',
          raw: { full_name: 'user/repo-1', name: 'repo-1', id: 'id-1' },
        },
        {
          label: 'user/repo-2',
          value: 'repo-2',
          raw: { full_name: 'user/repo-2', name: 'repo-2', id: 'id-2' },
        },
      ],
    })
  })

  it('passes params to Composio action', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ successfull: true, data: [] }),
    })

    const params = { org: 'myorg', type: 'public' }
    await fetchAppResource('github', 'GITHUB_LIST_ORG_REPOS', 'name', 'id', params)

    const executeCall = mockFetch.mock.calls[1]
    const executeBody = JSON.parse(executeCall[1].body)
    expect(executeBody).toEqual({
      connectedAccountId: 'conn-uuid',
      input: params,
    })
  })

  it('handles result with nested data path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successfull: true,
        data: {
          repositories: [
            { name: 'repo-1', id: 'id-1' },
            { name: 'repo-2', id: 'id-2' },
          ],
        },
      }),
    })

    const result = await fetchAppResource(
      'github',
      'GITHUB_LIST_USER_REPOS',
      'name',
      'id',
      undefined,
      'repositories'
    )

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toEqual({
      label: 'repo-1',
      value: 'id-1',
      raw: { name: 'repo-1', id: 'id-1' },
    })
  })

  it('handles result as direct array', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'slack', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successfull: true,
        data: [
          { name: 'channel-1', id: 'id-1' },
          { name: 'channel-2', id: 'id-2' },
        ],
      }),
    })

    const result = await fetchAppResource('slack', 'SLACK_LIST_CHANNELS', 'name', 'id')

    expect(result.items).toHaveLength(2)
    expect(result.items[0].label).toBe('channel-1')
  })

  it('handles result with common paths (data, items, channels)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })

    // Helper to set up connection + action mocks
    function setupMocks(responseData: unknown) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 'conn-uuid', appName: 'app', status: 'ACTIVE' }],
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ successfull: true, data: responseData }),
      })
    }

    // Test with data wrapper
    setupMocks({ data: [{ name: 'item-1', id: 'id-1' }] })
    let result = await fetchAppResource('app', 'ACTION', 'name', 'id')
    expect(result.items).toHaveLength(1)

    // Test with items wrapper
    setupMocks({ items: [{ name: 'item-2', id: 'id-2' }] })
    result = await fetchAppResource('app', 'ACTION', 'name', 'id')
    expect(result.items).toHaveLength(1)

    // Test with channels wrapper
    setupMocks({ channels: [{ name: 'channel-1', id: 'id-1' }] })
    result = await fetchAppResource('app', 'ACTION', 'name', 'id')
    expect(result.items).toHaveLength(1)
  })

  it('returns error when Composio action fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successfull: false,
        error: 'API rate limit exceeded',
      }),
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'API rate limit exceeded',
    })
  })

  it('skips items with null label or value', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successfull: true,
        data: [
          { name: 'valid-repo', id: 'id-1' },
          { name: null, id: 'id-2' },
          { name: 'repo-3', id: null },
          { name: 'another-valid', id: 'id-4' },
        ],
      }),
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result.items).toHaveLength(2)
    expect(result.items[0].label).toBe('valid-repo')
    expect(result.items[1].label).toBe('another-valid')
  })

  it('supports nested displayField', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successfull: true,
        data: [
          { owner: { login: 'user1' }, name: 'repo-1', id: 'id-1' },
          { owner: { login: 'user2' }, name: 'repo-2', id: 'id-2' },
        ],
      }),
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'owner.login', 'id')

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toEqual({
      label: 'user1',
      value: 'id-1',
      raw: { owner: { login: 'user1' }, name: 'repo-1', id: 'id-1' },
    })
    expect(result.items[1].label).toBe('user2')
  })

  it('returns error on Composio API HTTP error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Composio API error: 400',
    })
  })

  it('returns empty items on fetch error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Network error',
    })
  })

  it('handles non-Error exceptions', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockRejectedValue('string error')

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Failed to fetch resources',
    })
  })

  it('returns default error message when Composio action fails without error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'conn-uuid', appName: 'github', status: 'ACTIVE' }],
      }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ successfull: false }),
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Failed to fetch GITHUB_LIST_USER_REPOS',
    })
  })
})
