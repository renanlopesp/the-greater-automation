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
    render(<AgentCard agent={mockAgent} workflows={[]} />)
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
    expect(screen.getByText('A test agent description')).toBeInTheDocument()
  })

  it('renders "0 workflows" and "0 skills" when empty', () => {
    render(<AgentCard agent={mockAgent} workflows={[]} />)
    expect(screen.getByText('0 workflows')).toBeInTheDocument()
    expect(screen.getByText('0 skills')).toBeInTheDocument()
  })

  it('renders workflow and skill counts', () => {
    const workflows = [
      { id: '1', name: 'Workflow A' },
      { id: '2', name: 'Workflow B' },
      { id: '3', name: 'Workflow C' },
    ]
    render(<AgentCard agent={mockAgent} workflows={workflows} skillCount={5} />)
    expect(screen.getByText('3 workflows')).toBeInTheDocument()
    expect(screen.getByText('5 skills')).toBeInTheDocument()
  })

  it('renders singular labels for 1 workflow and 1 skill', () => {
    const workflows = [{ id: '1', name: 'Workflow A' }]
    render(<AgentCard agent={mockAgent} workflows={workflows} skillCount={1} />)
    expect(screen.getByText('1 workflow')).toBeInTheDocument()
    expect(screen.getByText('1 skill')).toBeInTheDocument()
  })

  it('renders avatar with agent name', () => {
    render(<AgentCard agent={mockAgent} workflows={[]} />)
    const avatar = screen.getByTestId('boring-avatar')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('aria-label', 'Test Agent')
  })
})
