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
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('renders sign up link', () => {
    render(<LoginForm />)
    const link = screen.getByRole('link', { name: /criar conta/i })
    expect(link).toHaveAttribute('href', '/signup')
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    // Zod validation should show errors
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('renders Google OAuth button', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /entrar com google/i })).toBeInTheDocument()
  })
})
