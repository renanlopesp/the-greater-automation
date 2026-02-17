import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import AccountSection from '@/components/settings/account-section'

// Mock actions
vi.mock('@/lib/actions/settings', () => ({
  updateProfileAction: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/actions/avatar', () => ({
  uploadAvatarAction: vi.fn().mockResolvedValue({ avatarUrl: 'https://example.com/avatar.jpg' }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('AccountSection', () => {
  const defaultProps = {
    fullName: 'Renan Lopes',
    email: 'renan@example.com',
    avatarUrl: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders account form with user info', () => {
    render(<AccountSection {...defaultProps} />)

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Renan Lopes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('renan@example.com')).toBeInTheDocument()
  })

  it('shows initials in avatar fallback', () => {
    render(<AccountSection {...defaultProps} />)

    expect(screen.getByText('RL')).toBeInTheDocument()
  })

  it('has disabled save button initially', () => {
    render(<AccountSection {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('enables save button when name is changed', async () => {
    const user = userEvent.setup()
    render(<AccountSection {...defaultProps} />)

    const input = screen.getByDisplayValue('Renan Lopes')
    await user.clear(input)
    await user.type(input, 'New Name')

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('shows email field as disabled', () => {
    render(<AccountSection {...defaultProps} />)

    expect(screen.getByDisplayValue('renan@example.com')).toBeDisabled()
  })

  it('has hidden file input for avatar upload', () => {
    const { container } = render(<AccountSection {...defaultProps} />)

    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveClass('hidden')
    expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/gif,image/webp')
  })

  it('shows upload hint text', () => {
    render(<AccountSection {...defaultProps} />)

    expect(screen.getByText('Click avatar to upload a new image')).toBeInTheDocument()
  })
})
