import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppStepConfigForm from '../app-step-config'
import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'

// Mock useAppConnections
vi.mock('@/hooks/use-app-connections', () => ({
  useAppConnections: vi.fn().mockReturnValue({
    data: {
      connections: [
        {
          id: '1',
          app_id: 'github',
          account_label: 'octocat',
          created_at: '2026-01-01',
        },
        {
          id: '2',
          app_id: 'slack',
          account_label: 'myworkspace',
          created_at: '2026-01-01',
        },
      ],
      availableApps: [],
      composioApps: [
        {
          id: 'github',
          name: 'GitHub',
          logoUrl: '',
          iconSlug: 'github',
          category: 'Development',
          authType: 'oauth',
          hasTriggers: true,
        },
        {
          id: 'slack',
          name: 'Slack',
          logoUrl: '',
          iconSlug: 'slack',
          category: 'Communication',
          authType: 'oauth',
          hasTriggers: true,
        },
      ],
    },
    isLoading: false,
  }),
}))

// Mock useAppActions
vi.mock('@/hooks/use-app-actions', () => ({
  useAppActions: vi.fn().mockReturnValue({
    data: [
      {
        name: 'GITHUB_CREATE_ISSUE',
        displayName: 'Create Issue',
        description: 'Create a new issue',
        params: [
          {
            key: 'repo',
            label: 'Repository',
            type: 'text',
            required: true,
            description: 'Target repository',
          },
          {
            key: 'owner',
            label: 'Owner',
            type: 'text',
            required: true,
            description: 'Repo owner',
          },
          {
            key: 'title',
            label: 'Title',
            type: 'text',
            required: true,
          },
          {
            key: 'body',
            label: 'Body',
            type: 'textarea',
            required: false,
          },
        ],
      },
      {
        name: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
        displayName: 'List Repositories',
        description: 'List user repositories',
        params: [],
      },
      {
        name: 'GITHUB_DELETE_BRANCH',
        displayName: 'Delete Branch',
        description: 'Delete a branch',
        params: [],
      },
    ],
    isLoading: false,
  }),
}))

// Mock useAppResources
vi.mock('@/hooks/use-app-resources', () => ({
  useAppResources: vi.fn().mockReturnValue({
    data: { items: [] },
    isLoading: false,
  }),
}))

// Mock composio modules — now only has fieldOverrides (no category/icon)
vi.mock('@/lib/composio/modules', () => ({
  getAppModule: vi.fn().mockReturnValue({
    appId: 'github',
    displayName: 'GitHub',
    actions: {
      GITHUB_CREATE_ISSUE: {
        fieldOverrides: {
          repo: {
            type: 'select',
            dataSource: {
              action: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
              displayField: 'full_name',
              valueField: 'name',
            },
          },
        },
      },
    },
  }),
  categorizeAction: vi.fn(),
}))

// Mock categorizeAction — used by the component for auto-categorization
vi.mock('@/lib/composio/actions/categorize', () => ({
  categorizeAction: vi.fn().mockImplementation((actionName: string) => {
    if (actionName === 'GITHUB_CREATE_ISSUE') {
      return { category: 'Issue', actionType: 'create' }
    }
    if (actionName === 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER') {
      return { category: 'User Repo', actionType: 'find' }
    }
    if (actionName === 'GITHUB_DELETE_BRANCH') {
      return { category: 'Branch', actionType: 'delete' }
    }
    return { category: 'General', actionType: 'other' }
  }),
}))

// Mock next/image — filter Next.js-specific props to avoid DOM warnings
vi.mock('next/image', () => ({
  default: ({ unoptimized: _u, ...props }: Record<string, unknown>) => <img {...props} />,
}))

describe('AppStepConfigForm', () => {
  const mockOnUpdate = vi.fn()

  const defaultConfig: AppStepConfig = {
    app_id: '',
    action: '',
    inputs: {},
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    // Restore default mocks
    const { useAppConnections } = await import('@/hooks/use-app-connections')
    const mockUseAppConnections = useAppConnections as ReturnType<typeof vi.fn>
    mockUseAppConnections.mockReturnValue({
      data: {
        connections: [
          { id: '1', app_id: 'github', account_label: 'octocat', created_at: '2026-01-01' },
          { id: '2', app_id: 'slack', account_label: 'myworkspace', created_at: '2026-01-01' },
        ],
        availableApps: [],
        composioApps: [
          {
            id: 'github',
            name: 'GitHub',
            logoUrl: '',
            iconSlug: 'github',
            category: 'Development',
            authType: 'oauth',
            hasTriggers: true,
          },
          {
            id: 'slack',
            name: 'Slack',
            logoUrl: '',
            iconSlug: 'slack',
            category: 'Communication',
            authType: 'oauth',
            hasTriggers: true,
          },
        ],
      },
      isLoading: false,
    })

    const { useAppResources } = await import('@/hooks/use-app-resources')
    const mockUseAppResources = useAppResources as ReturnType<typeof vi.fn>
    mockUseAppResources.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    })
  })

  it('renders only connected apps', () => {
    render(<AppStepConfigForm config={defaultConfig} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.queryByText('Discord')).not.toBeInTheDocument()
    expect(screen.queryByText('LinkedIn')).not.toBeInTheDocument()
    expect(screen.queryByText('Notion')).not.toBeInTheDocument()
  })

  it('shows empty state when no apps connected', async () => {
    const { useAppConnections } = await import('@/hooks/use-app-connections')
    const mockUseAppConnections = useAppConnections as ReturnType<typeof vi.fn>
    mockUseAppConnections.mockReturnValue({
      data: {
        connections: [],
        availableApps: [],
        composioApps: [],
      },
      isLoading: false,
    })

    render(<AppStepConfigForm config={defaultConfig} onUpdate={mockOnUpdate} />)

    const emptyMessage = screen.queryByText(/no apps connected/i)
    expect(emptyMessage).toBeInTheDocument()
  })

  it('calls onUpdate when app is selected', async () => {
    const user = userEvent.setup()

    render(<AppStepConfigForm config={defaultConfig} onUpdate={mockOnUpdate} />)

    const githubButton = screen.getByRole('button', { name: /github/i })
    await user.click(githubButton)

    expect(mockOnUpdate).toHaveBeenCalledWith({
      app_id: 'github',
      action: '',
      inputs: {},
    })
  })

  it('shows loading state while connections load', async () => {
    const { useAppConnections } = await import('@/hooks/use-app-connections')
    const mockUseAppConnections = useAppConnections as ReturnType<typeof vi.fn>
    mockUseAppConnections.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    render(<AppStepConfigForm config={defaultConfig} onUpdate={mockOnUpdate} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows auto-categorized action list after selecting app', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Open the action combobox
    await user.click(screen.getByRole('combobox'))

    // Categories are auto-derived from action names via categorizeAction
    expect(screen.getByText('Branch')).toBeInTheDocument()
    expect(screen.getByText('Issue')).toBeInTheDocument()
    expect(screen.getByText('User Repo')).toBeInTheDocument()

    // Action display names
    expect(screen.getByText('Create Issue')).toBeInTheDocument()
    expect(screen.getByText('List Repositories')).toBeInTheDocument()
    expect(screen.getByText('Delete Branch')).toBeInTheDocument()
  })

  it('groups actions by auto-derived category', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Open the action combobox
    await user.click(screen.getByRole('combobox'))

    // "Create Issue" should be under "Issue" category (CommandGroup)
    const issueHeader = screen.getByText('Issue')
    const issueGroup = issueHeader.closest('[cmdk-group]') as HTMLElement
    expect(issueGroup).toBeInTheDocument()
    expect(within(issueGroup).getByText('Create Issue')).toBeInTheDocument()

    // "Delete Branch" should be under "Branch" category
    const branchHeader = screen.getByText('Branch')
    const branchGroup = branchHeader.closest('[cmdk-group]') as HTMLElement
    expect(branchGroup).toBeInTheDocument()
    expect(within(branchGroup).getByText('Delete Branch')).toBeInTheDocument()
  })

  it('shows search input for filtering actions', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Open the action combobox
    await user.click(screen.getByRole('combobox'))

    const searchInput = screen.getByPlaceholderText('Search actions...')
    expect(searchInput).toBeInTheDocument()
  })

  it('filters actions when searching', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Open the action combobox
    await user.click(screen.getByRole('combobox'))

    const searchInput = screen.getByPlaceholderText('Search actions...')
    await user.type(searchInput, 'Create')

    // Only "Create Issue" should remain visible as an option
    expect(screen.getByRole('option', { name: /Create Issue/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /List Repositories/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Delete Branch/ })).not.toBeInTheDocument()
  })

  it('shows no-results message when search has no matches', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Open the action combobox
    await user.click(screen.getByRole('combobox'))

    const searchInput = screen.getByPlaceholderText('Search actions...')
    await user.type(searchInput, 'zzzznonexistent')

    expect(screen.queryByRole('option', { name: /Create Issue/ })).not.toBeInTheDocument()
    expect(screen.getByText('No actions found.')).toBeInTheDocument()
  })

  it('calls onUpdate when action is selected from combobox', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Open the action combobox
    await user.click(screen.getByRole('combobox'))

    // Click "Create Issue" option
    const option = screen.getByRole('option', { name: /Create Issue/ })
    await user.click(option)

    expect(mockOnUpdate).toHaveBeenCalledWith({
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    })
  })

  it('renders dynamic input fields after selecting action', () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // repo is now a searchable combobox (button with combobox role)
    expect(screen.getByRole('combobox', { name: /repository/i })).toBeInTheDocument()
    // owner and title are text inputs
    expect(screen.getByLabelText(/owner/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    // body is textarea
    expect(screen.getByLabelText(/body/i)).toBeInTheDocument()
  })

  it('shows searchable combobox for repo field when module has override', () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // The combobox button should exist — proves it's a searchable combobox, not a text input
    const repoCombobox = screen.getByRole('combobox', { name: /repository/i })
    expect(repoCombobox).toBeInTheDocument()
  })

  it('renders text input for fields without overrides', () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // title and owner have no overrides, should be text inputs
    const titleInput = screen.getByLabelText(/title/i)
    expect(titleInput).toBeInTheDocument()
    expect(titleInput.tagName).toBe('INPUT')
    expect(titleInput).toHaveAttribute('type', 'text')

    const ownerInput = screen.getByLabelText(/owner/i)
    expect(ownerInput).toBeInTheDocument()
    expect(ownerInput.tagName).toBe('INPUT')
    expect(ownerInput).toHaveAttribute('type', 'text')
  })

  it('marks required fields', () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Use getLabelText to get the label element for form fields
    const repoLabel = screen
      .getByRole('combobox', { name: /repository/i })
      .closest('div')
      ?.querySelector('label')
    expect(repoLabel?.textContent).toContain('*')

    const ownerLabel = screen.getByLabelText(/owner/i).closest('div')?.querySelector('label')
    expect(ownerLabel?.textContent).toContain('*')

    const titleLabel = screen.getByLabelText(/title/i).closest('div')?.querySelector('label')
    expect(titleLabel?.textContent).toContain('*')

    const bodyLabel = screen.getByLabelText(/body/i).closest('div')?.querySelector('label')
    expect(bodyLabel?.textContent).not.toContain('*')
  })

  it('calls onUpdate when text input changes', () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    const titleInput = screen.getByLabelText(/title/i)
    fireEvent.change(titleInput, { target: { value: 'Fix bug' } })

    expect(mockOnUpdate).toHaveBeenCalledWith({
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: { title: 'Fix bug' },
    })
  })

  it('shows loading state for data-driven combobox fields', async () => {
    const { useAppResources } = await import('@/hooks/use-app-resources')
    const mockUseAppResources = useAppResources as ReturnType<typeof vi.fn>
    mockUseAppResources.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // The combobox button should show loading state and be disabled
    const repoCombobox = screen.getByRole('combobox', { name: /repository/i })
    expect(repoCombobox).toBeDisabled()
  })

  it('shows dependency warning when required deps not met', async () => {
    const { getAppModule } = await import('@/lib/composio/modules')
    const mockGetAppModule = getAppModule as ReturnType<typeof vi.fn>
    mockGetAppModule.mockReturnValue({
      appId: 'github',
      displayName: 'GitHub',
      actions: {
        GITHUB_CREATE_ISSUE: {
          fieldOverrides: {
            repo: {
              type: 'select',
              dependsOn: ['owner'],
              dataSource: {
                action: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
                displayField: 'full_name',
                valueField: 'name',
              },
            },
          },
        },
      },
    })

    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Should show dependency warning for repo field
    expect(screen.getByText('Select owner first')).toBeInTheDocument()
  })

  it('resets inputs when action changes', async () => {
    const user = userEvent.setup()
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: { title: 'Old title' },
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Open the action combobox (first combobox — the action selector)
    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[0])

    // Select a different action
    const option = screen.getByRole('option', { name: /List Repositories/ })
    await user.click(option)

    expect(mockOnUpdate).toHaveBeenCalledWith({
      app_id: 'github',
      action: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
      inputs: {},
    })
  })

  it('displays action type icons next to action names', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Open the action combobox
    await user.click(screen.getByRole('combobox'))

    // Each action option should contain an SVG icon
    const createIssueOption = screen.getByRole('option', { name: /Create Issue/ })
    expect(createIssueOption?.querySelector('svg')).toBeInTheDocument()

    const deleteOption = screen.getByRole('option', { name: /Delete Branch/ })
    expect(deleteOption?.querySelector('svg')).toBeInTheDocument()
  })
})
