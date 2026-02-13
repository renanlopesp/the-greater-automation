import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getAppActions } from '../get-app-actions'
import type { ComposioAppAction } from '../get-app-actions'

// Mock the Composio client
vi.mock('../../client', () => ({
  getComposio: vi.fn().mockReturnValue({
    actions: {
      list: vi.fn(),
    },
  }),
}))

describe('getAppActions', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset the mock implementation for each test
    const { getComposio } = await import('../../client')
    const mockComposio = getComposio()
    const mockList = mockComposio.actions.list as ReturnType<typeof vi.fn>
    mockList.mockReset()
  })

  it('returns parsed actions for a valid app', async () => {
    const { getComposio } = await import('../../client')
    const mockComposio = getComposio()
    const mockList = mockComposio.actions.list as ReturnType<typeof vi.fn>

    mockList.mockResolvedValue({
      items: [
        {
          name: 'GITHUB_CREATE_ISSUE',
          displayName: 'Create Issue',
          description: 'Create a new issue',
          parameters: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                title: 'Owner',
                description: 'Repository owner',
              },
              repo: {
                type: 'string',
                title: 'Repository',
                description: 'Repo name',
              },
              title: {
                type: 'string',
                title: 'Title',
                description: 'Issue title',
              },
              body: {
                type: 'string',
                title: 'Body',
                description: 'Issue body',
              },
            },
            required: ['owner', 'repo', 'title'],
          },
          deprecated: false,
          appKey: 'github',
          appName: 'github',
        },
      ],
    })

    const result = await getAppActions('github')

    expect(result).toHaveLength(1)
    const action = result[0] as ComposioAppAction
    expect(action.name).toBe('GITHUB_CREATE_ISSUE')
    expect(action.displayName).toBe('Create Issue')
    expect(action.description).toBe('Create a new issue')
    expect(action.params).toHaveLength(4)

    const ownerParam = action.params.find((p) => p.key === 'owner')
    expect(ownerParam).toEqual({
      key: 'owner',
      label: 'Owner',
      type: 'text',
      required: true,
      description: 'Repository owner',
      placeholder: 'Repository owner',
    })

    const titleParam = action.params.find((p) => p.key === 'title')
    expect(titleParam?.required).toBe(true)

    const bodyParam = action.params.find((p) => p.key === 'body')
    expect(bodyParam?.required).toBe(false)
    expect(bodyParam?.type).toBe('textarea')
  })

  it('filters out deprecated actions', async () => {
    const { getComposio } = await import('../../client')
    const mockComposio = getComposio()
    const mockList = mockComposio.actions.list as ReturnType<typeof vi.fn>

    mockList.mockResolvedValue({
      items: [
        {
          name: 'GITHUB_CREATE_ISSUE',
          displayName: 'Create Issue',
          description: 'Create a new issue',
          parameters: {
            properties: {},
            required: [],
          },
          deprecated: false,
        },
        {
          name: 'GITHUB_OLD_ACTION',
          displayName: 'Old Action',
          description: 'Deprecated action',
          parameters: {
            properties: {},
            required: [],
          },
          deprecated: true,
        },
      ],
    })

    const result = await getAppActions('github')

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('GITHUB_CREATE_ISSUE')
  })

  it('returns empty array when Composio fails', async () => {
    const { getComposio } = await import('../../client')
    const mockComposio = getComposio()
    const mockList = mockComposio.actions.list as ReturnType<typeof vi.fn>

    mockList.mockRejectedValue(new Error('API error'))

    const result = await getAppActions('github')

    expect(result).toEqual([])
  })

  it('handles missing parameters gracefully', async () => {
    const { getComposio } = await import('../../client')
    const mockComposio = getComposio()
    const mockList = mockComposio.actions.list as ReturnType<typeof vi.fn>

    mockList.mockResolvedValue({
      items: [
        {
          name: 'SIMPLE_ACTION',
          displayName: 'Simple Action',
          description: 'Action with no parameters',
          deprecated: false,
        },
      ],
    })

    const result = await getAppActions('testapp')

    expect(result).toHaveLength(1)
    expect(result[0]?.params).toEqual([])
  })

  it('maps JSON Schema types correctly', async () => {
    const { getComposio } = await import('../../client')
    const mockComposio = getComposio()
    const mockList = mockComposio.actions.list as ReturnType<typeof vi.fn>

    mockList.mockResolvedValue({
      items: [
        {
          name: 'TYPE_TEST',
          displayName: 'Type Test',
          description: 'Test type mapping',
          parameters: {
            properties: {
              textField: { type: 'string', title: 'Text Field' },
              integerField: { type: 'integer', title: 'Integer Field' },
              numberField: { type: 'number', title: 'Number Field' },
              urlField: {
                type: 'string',
                title: 'URL Field',
                description: 'Enter a URL',
              },
              longTextField: {
                type: 'string',
                title: 'Long Text',
                description: 'Enter a long description',
              },
            },
            required: [],
          },
          deprecated: false,
        },
      ],
    })

    const result = await getAppActions('testapp')

    expect(result).toHaveLength(1)
    const params = result[0]?.params ?? []
    expect(params.length).toBeGreaterThan(0)

    const textParam = params.find((p) => p.key === 'textField')
    expect(textParam).toBeDefined()
    expect(textParam?.type).toBe('text')

    const integerParam = params.find((p) => p.key === 'integerField')
    expect(integerParam?.type).toBe('number')

    const numberParam = params.find((p) => p.key === 'numberField')
    expect(numberParam?.type).toBe('number')

    const urlParam = params.find((p) => p.key === 'urlField')
    expect(urlParam?.type).toBe('url')

    const longTextParam = params.find((p) => p.key === 'longTextField')
    expect(longTextParam?.type).toBe('textarea')
  })
})
