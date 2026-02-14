import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoist mock variables so vi.mock factories can reference them
const { mockExecute, mockGetUser, mockSingle, mockEq2, mockEq1, mockSelect, mockFrom } = vi.hoisted(
  () => {
    const mockSingle = vi.fn()
    const mockEq2 = vi.fn(() => ({ single: mockSingle }))
    const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
    const mockSelect = vi.fn(() => ({ eq: mockEq1 }))
    const mockFrom = vi.fn(() => ({ select: mockSelect }))
    const mockGetUser = vi.fn()
    const mockExecute = vi.fn()
    return { mockExecute, mockGetUser, mockSingle, mockEq2, mockEq1, mockSelect, mockFrom }
  }
)

vi.mock('../../client', () => ({
  getComposio: vi.fn(() => ({ tools: { execute: mockExecute } })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

import { fetchAppResource } from '../fetch-resource'

describe('fetchAppResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecute.mockReset()
    // Restore chained return values after clearAllMocks
    mockEq2.mockReturnValue({ single: mockSingle })
    mockEq1.mockReturnValue({ eq: mockEq2 })
    mockSelect.mockReturnValue({ eq: mockEq1 })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Not authenticated',
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error when no connection found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({ data: null })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'No github connection found',
    })
    expect(mockFrom).toHaveBeenCalledWith('app_connections')
    expect(mockSelect).toHaveBeenCalledWith('composio_connection_id')
    expect(mockEq1).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockEq2).toHaveBeenCalledWith('app_id', 'github')
  })

  it('fetches resources and maps to ResourceItem[]', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: true,
      data: [
        { name: 'repo-1', id: 'id-1' },
        { name: 'repo-2', id: 'id-2' },
      ],
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [
        { label: 'repo-1', value: 'id-1', raw: { name: 'repo-1', id: 'id-1' } },
        { label: 'repo-2', value: 'id-2', raw: { name: 'repo-2', id: 'id-2' } },
      ],
    })
    expect(mockExecute).toHaveBeenCalledWith('GITHUB_LIST_USER_REPOS', {
      connectedAccountId: 'conn-456',
      arguments: {},
    })
  })

  it('uses displayField and valueField to map items', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: true,
      data: [
        { full_name: 'user/repo-1', name: 'repo-1', id: 'id-1' },
        { full_name: 'user/repo-2', name: 'repo-2', id: 'id-2' },
      ],
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
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: true,
      data: [],
    })

    const params = { org: 'myorg', type: 'public' }
    await fetchAppResource('github', 'GITHUB_LIST_ORG_REPOS', 'name', 'id', params)

    expect(mockExecute).toHaveBeenCalledWith('GITHUB_LIST_ORG_REPOS', {
      connectedAccountId: 'conn-456',
      arguments: params,
    })
  })

  it('handles result with nested data path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: true,
      data: {
        repositories: [
          { name: 'repo-1', id: 'id-1' },
          { name: 'repo-2', id: 'id-2' },
        ],
      },
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
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: true,
      data: [
        { name: 'channel-1', id: 'id-1' },
        { name: 'channel-2', id: 'id-2' },
      ],
    })

    const result = await fetchAppResource('slack', 'SLACK_LIST_CHANNELS', 'name', 'id')

    expect(result.items).toHaveLength(2)
    expect(result.items[0].label).toBe('channel-1')
  })

  it('handles result with common paths (data, items, channels)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })

    // Test with data wrapper
    mockExecute.mockResolvedValueOnce({
      successful: true,
      data: {
        data: [{ name: 'item-1', id: 'id-1' }],
      },
    })
    let result = await fetchAppResource('app', 'ACTION', 'name', 'id')
    expect(result.items).toHaveLength(1)

    // Test with items wrapper
    mockExecute.mockResolvedValueOnce({
      successful: true,
      data: {
        items: [{ name: 'item-2', id: 'id-2' }],
      },
    })
    result = await fetchAppResource('app', 'ACTION', 'name', 'id')
    expect(result.items).toHaveLength(1)

    // Test with channels wrapper
    mockExecute.mockResolvedValueOnce({
      successful: true,
      data: {
        channels: [{ name: 'channel-1', id: 'id-1' }],
      },
    })
    result = await fetchAppResource('app', 'ACTION', 'name', 'id')
    expect(result.items).toHaveLength(1)
  })

  it('returns error when Composio action fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: false,
      error: 'API rate limit exceeded',
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'API rate limit exceeded',
    })
  })

  it('skips items with null label or value', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: true,
      data: [
        { name: 'valid-repo', id: 'id-1' },
        { name: null, id: 'id-2' },
        { name: 'repo-3', id: null },
        { name: 'another-valid', id: 'id-4' },
      ],
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result.items).toHaveLength(2)
    expect(result.items[0].label).toBe('valid-repo')
    expect(result.items[1].label).toBe('another-valid')
  })

  it('supports nested displayField', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: true,
      data: [
        { owner: { login: 'user1' }, name: 'repo-1', id: 'id-1' },
        { owner: { login: 'user2' }, name: 'repo-2', id: 'id-2' },
      ],
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

  it('returns empty items on error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockRejectedValue(new Error('Network error'))

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Network error',
    })
  })

  it('handles non-Error exceptions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockRejectedValue('string error')

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Failed to fetch resources',
    })
  })

  it('handles connection without composio_connection_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: null },
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'No github connection found',
    })
  })

  it('returns default error message when Composio action fails without error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({
      data: { composio_connection_id: 'conn-456' },
    })
    mockExecute.mockResolvedValue({
      successful: false,
    })

    const result = await fetchAppResource('github', 'GITHUB_LIST_USER_REPOS', 'name', 'id')

    expect(result).toEqual({
      items: [],
      error: 'Failed to fetch GITHUB_LIST_USER_REPOS',
    })
  })
})
