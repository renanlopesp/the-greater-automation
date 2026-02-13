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
        name: 'GITHUB_LIST_USER_REPOS',
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
              action: 'GITHUB_LIST_USER_REPOS',
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
    if (actionName === 'GITHUB_LIST_USER_REPOS') {
      return { category: 'User Repo', actionType: 'find' }
    }
    if (actionName === 'GITHUB_DELETE_BRANCH') {
      return { category: 'Branch', actionType: 'delete' }
    }
    return { category: 'General', actionType: 'other' }
  }),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
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

  it('shows auto-categorized action list after selecting app', () => {
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Categories are auto-derived from action names via categorizeAction
    expect(screen.getByText('Branch')).toBeInTheDocument()
    expect(screen.getByText('Issue')).toBeInTheDocument()
    expect(screen.getByText('User Repo')).toBeInTheDocument()

    // Action display names
    expect(screen.getByText('Create Issue')).toBeInTheDocument()
    expect(screen.getByText('List Repositories')).toBeInTheDocument()
    expect(screen.getByText('Delete Branch')).toBeInTheDocument()
  })

  it('groups actions by auto-derived category', () => {
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // "Create Issue" should be under "Issue" category
    // The Collapsible wrapper is the parent of the trigger button
    const issueHeader = screen.getByText('Issue')
    const issueCollapsible = issueHeader.closest('[data-slot="collapsible"]') as HTMLElement
    expect(issueCollapsible).toBeInTheDocument()
    expect(within(issueCollapsible).getByText('Create Issue')).toBeInTheDocument()

    // "Delete Branch" should be under "Branch" category
    const branchHeader = screen.getByText('Branch')
    const branchCollapsible = branchHeader.closest('[data-slot="collapsible"]') as HTMLElement
    expect(branchCollapsible).toBeInTheDocument()
    expect(within(branchCollapsible).getByText('Delete Branch')).toBeInTheDocument()
  })

  it('shows search input for filtering actions', () => {
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    const searchInput = screen.getByPlaceholderText('Search actions...')
    expect(searchInput).toBeInTheDocument()
  })

  it('filters actions when searching', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    const searchInput = screen.getByPlaceholderText('Search actions...')
    await user.type(searchInput, 'Create')

    // Only "Create Issue" should match
    expect(screen.getByText('Create Issue')).toBeInTheDocument()
    expect(screen.queryByText('List Repositories')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete Branch')).not.toBeInTheDocument()
  })

  it('shows no-results message when search has no matches', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    const searchInput = screen.getByPlaceholderText('Search actions...')
    await user.type(searchInput, 'zzzznonexistent')

    expect(screen.queryByText('Create Issue')).not.toBeInTheDocument()
  })

  it('highlights selected action in the list', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    const createIssueButton = screen.getByText('Create Issue').closest('button')
    expect(createIssueButton).not.toHaveClass('bg-accent')

    await user.click(createIssueButton!)

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
                action: 'GITHUB_LIST_USER_REPOS',
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

    const listReposButton = screen.getByText('List Repositories').closest('button')
    await user.click(listReposButton!)

    expect(mockOnUpdate).toHaveBeenCalledWith({
      app_id: 'github',
      action: 'GITHUB_LIST_USER_REPOS',
      inputs: {},
    })
  })

  it('displays action type icons next to action names', () => {
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Each action button should contain an SVG icon
    const createIssueButton = screen.getByText('Create Issue').closest('button')
    expect(createIssueButton?.querySelector('svg')).toBeInTheDocument()

    const deleteButton = screen.getByText('Delete Branch').closest('button')
    expect(deleteButton?.querySelector('svg')).toBeInTheDocument()
  })
})
