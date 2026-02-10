import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AgentCard from '@/components/dashboard/agent-card'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { whileHover, transition, ...rest } = props
      return <div {...rest}>{children}</div>
    },
  },
}))

vi.mock('boring-avatars', () => ({
  default: ({ name, size }: { name: string; size: number }) => (
    <svg data-testid="boring-avatar" aria-label={name} width={size} height={size} />
  ),
}))

describe('AgentCard', () => {
  const mockAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'A test agent description',
    avatar_url: null,
  }

  it('renders agent name and description', () => {
    render(<AgentCard agent={mockAgent} skills={[]} />)
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
    expect(screen.getByText('A test agent description')).toBeInTheDocument()
  })

  it('renders "0 skills" when no skills', () => {
    render(<AgentCard agent={mockAgent} skills={[]} />)
    expect(screen.getByText('0 skills')).toBeInTheDocument()
  })

  it('renders skill count for multiple skills', () => {
    const skills = [
      { id: '1', name: 'Skill A' },
      { id: '2', name: 'Skill B' },
      { id: '3', name: 'Skill C' },
    ]
    render(<AgentCard agent={mockAgent} skills={skills} />)
    expect(screen.getByText('3 skills')).toBeInTheDocument()
  })

  it('renders singular skill label for 1 skill', () => {
    const skills = [{ id: '1', name: 'Skill A' }]
    render(<AgentCard agent={mockAgent} skills={skills} />)
    expect(screen.getByText('1 skill')).toBeInTheDocument()
  })

  it('renders avatar with agent name', () => {
    render(<AgentCard agent={mockAgent} skills={[]} />)
    const avatar = screen.getByTestId('boring-avatar')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('aria-label', 'Test Agent')
  })
})
