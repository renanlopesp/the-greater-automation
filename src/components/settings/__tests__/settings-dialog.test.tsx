import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SettingsDialog from '@/components/settings/settings-dialog'

// Mock sonner
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
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
    expect(screen.getByText('PERSONAL')).toBeInTheDocument()
    expect(screen.getByText('WORKSPACE')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getAllByText('Manage apps').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
  })

  it('defaults to manage-apps section', () => {
    render(<SettingsDialog {...defaultProps} />)
    expect(screen.getByPlaceholderText('Search apps...')).toBeInTheDocument()
  })

  it('switches to account section on click', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('switches to notifications section on click', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByText('Email notifications')).toBeInTheDocument()
  })
})
