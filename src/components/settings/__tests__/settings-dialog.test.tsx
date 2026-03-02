import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SettingsDialog from '@/components/settings/settings-dialog'

// Mock sonner
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}))

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: {
      connections: [],
      availableApps: [],
    },
    isLoading: false,
  }),
  useMutation: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  }),
  useQueryClient: vi.fn().mockReturnValue({
    invalidateQueries: vi.fn(),
    cancelQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  }),
}))

// Mock notification preferences hook
vi.mock('@/hooks/use-notification-preferences', () => ({
  useNotificationPreferences: vi.fn().mockReturnValue({
    preferences: {
      emailEnabled: true,
      failuresEnabled: true,
      digestEnabled: true,
    },
    isLoading: false,
    updatePreference: vi.fn(),
    isUpdating: false,
  }),
}))

// Mock server actions
vi.mock('@/lib/actions/settings', () => ({
  updateProfileAction: vi.fn().mockResolvedValue({ success: true }),
  updateWorkspaceAction: vi.fn().mockResolvedValue({ success: true }),
}))

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  profile: { fullName: 'Test User', email: 'test@example.com', avatarUrl: null },
  team: { name: 'My Team', slug: 'my-team' },
  usage: { stepsUsed: 50, stepsLimit: 100, aiCreditsUsed: 25, aiCreditsLimit: 100 },
  members: [{ id: '1', fullName: 'Test User', email: 'test@example.com', role: 'owner' as const }],
}

describe('SettingsDialog', () => {
  it('renders dialog when open', () => {
    render(<SettingsDialog {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render dialog when closed', () => {
    render(<SettingsDialog {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders sidebar sections', () => {
    render(<SettingsDialog {...defaultProps} />)
    expect(screen.getByText('PESSOAL')).toBeInTheDocument()
    expect(screen.getByText('WORKSPACE')).toBeInTheDocument()
    expect(screen.getByText('Conta')).toBeInTheDocument()
    expect(screen.getByText('Notificações')).toBeInTheDocument()
    expect(screen.getAllByText('Aplicativos').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Geral')).toBeInTheDocument()
    expect(screen.getByText('Membros')).toBeInTheDocument()
    expect(screen.getByText('Cobrança')).toBeInTheDocument()
  })

  it('defaults to manage-apps section', () => {
    render(<SettingsDialog {...defaultProps} />)
    expect(screen.getByPlaceholderText('Buscar aplicativos...')).toBeInTheDocument()
  })

  it('switches to account section on click', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Conta' }))
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('switches to notifications section on click', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Notificações' }))
    expect(screen.getByText('Notificações por e-mail')).toBeInTheDocument()
  })
})
