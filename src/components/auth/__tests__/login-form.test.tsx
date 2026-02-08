import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LoginForm from '@/components/auth/login-form'

// Mock server actions
vi.mock('@/lib/actions/auth', () => ({
  loginAction: vi.fn().mockResolvedValue({}),
  signInWithGoogleAction: vi.fn(),
}))

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('renders sign up link', () => {
    render(<LoginForm />)
    const link = screen.getByRole('link', { name: /sign up/i })
    expect(link).toHaveAttribute('href', '/signup')
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /log in/i }))

    // Zod validation should show errors
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('renders Google OAuth button', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })
})
