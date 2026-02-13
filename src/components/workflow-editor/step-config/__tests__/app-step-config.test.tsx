import { fireEvent, render, screen } from '@testing-library/react'
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
    ],
    isLoading: false,
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

  it('shows action dropdown after selecting app', async () => {
    const user = userEvent.setup()
    const config = { ...defaultConfig, app_id: 'github' }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /action/i })).toBeInTheDocument()
  })

  it('renders dynamic input fields after selecting action', async () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    expect(screen.getByLabelText(/owner/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/body/i)).toBeInTheDocument()
  })

  it('marks required fields', () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    const ownerLabel = screen.getByText('Owner')
    expect(ownerLabel.textContent).toContain('*')

    const titleLabel = screen.getByText('Title')
    expect(titleLabel.textContent).toContain('*')

    const bodyLabel = screen.getByText('Body')
    expect(bodyLabel.textContent).not.toContain('*')
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

  it('renders action select with selected value', () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    // Verify the select trigger is rendered with the selected action
    const actionSelect = screen.getByRole('combobox', { name: /action/i })
    expect(actionSelect).toBeInTheDocument()
    expect(actionSelect.textContent).toContain('Create Issue')
  })

  it('calls onUpdate when input changes', () => {
    const config: AppStepConfig = {
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    }

    render(<AppStepConfigForm config={config} onUpdate={mockOnUpdate} />)

    const ownerInput = screen.getByLabelText(/owner/i)
    fireEvent.change(ownerInput, { target: { value: 'myorg' } })

    expect(mockOnUpdate).toHaveBeenCalledWith({
      app_id: 'github',
      action: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'myorg' },
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
})
