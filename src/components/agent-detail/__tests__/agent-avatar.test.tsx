import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AgentAvatar from '../agent-avatar'

vi.mock('boring-avatars', () => ({
  default: ({ name, size }: { name: string; size: number }) => (
    <svg data-testid="boring-avatar" aria-label={name} width={size} height={size} />
  ),
}))

describe('AgentAvatar', () => {
  it('renders avatar with name', () => {
    render(<AgentAvatar name="Data Scout" />)
    const avatar = screen.getByTestId('boring-avatar')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('aria-label', 'Data Scout')
  })

  it('renders avatar with single-word name', () => {
    render(<AgentAvatar name="Scout" />)
    const avatar = screen.getByTestId('boring-avatar')
    expect(avatar).toHaveAttribute('aria-label', 'Scout')
  })

  it('renders default "Agent" fallback when no name provided', () => {
    render(<AgentAvatar />)
    const avatar = screen.getByTestId('boring-avatar')
    expect(avatar).toHaveAttribute('aria-label', 'Agent')
    expect(avatar).toHaveAttribute('width', '80')
  })
})
