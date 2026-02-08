import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AuthErrorMessage from '@/components/auth/auth-error-message'

// Mock useSearchParams
const mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

describe('AuthErrorMessage', () => {
  it('renders nothing when no error param', () => {
    mockSearchParams.delete('error')
    const { container } = render(<AuthErrorMessage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders error message for oauth_error', () => {
    mockSearchParams.set('error', 'oauth_error')
    render(<AuthErrorMessage />)
    expect(screen.getByText('Authentication failed. Please try again.')).toBeInTheDocument()
  })

  it('renders error message for expired_code', () => {
    mockSearchParams.set('error', 'expired_code')
    render(<AuthErrorMessage />)
    expect(
      screen.getByText('Authentication session expired. Please try again.')
    ).toBeInTheDocument()
  })

  it('renders generic message for unknown error code', () => {
    mockSearchParams.set('error', 'unknown_error')
    render(<AuthErrorMessage />)
    expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument()
  })
})
