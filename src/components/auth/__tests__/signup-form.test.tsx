import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SignupForm from '@/components/auth/signup-form'

// Mock server actions
vi.mock('@/lib/actions/auth', () => ({
  signupAction: vi.fn().mockResolvedValue({}),
  signInWithGoogleAction: vi.fn(),
}))

describe('SignupForm', () => {
  it('renders fullName, email, and password inputs', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<SignupForm />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders log in link', () => {
    render(<SignupForm />)
    const link = screen.getByRole('link', { name: /log in/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/full name is required/i)).toBeInTheDocument()
  })
})
