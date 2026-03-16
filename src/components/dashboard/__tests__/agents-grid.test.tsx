import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AgentsGrid from '@/components/dashboard/agents-grid'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { whileHover, transition, ...rest } = props
      return <div {...rest}>{children}</div>
    },
  },
}))

const mockAgents = [
  {
    agent: { id: 'a1', name: 'Support Agent', description: 'Handles tickets', avatar_url: null },
    workflows: [{ id: 's1', name: 'Email Triage' }],
  },
  {
    agent: { id: 'a2', name: 'Data Agent', description: 'Processes data', avatar_url: null },
    workflows: [],
  },
]

describe('AgentsGrid', () => {
  it('renders all agent cards', () => {
    render(<AgentsGrid agents={mockAgents} />)
    expect(screen.getByText('Support Agent')).toBeInTheDocument()
    expect(screen.getByText('Data Agent')).toBeInTheDocument()
  })

  it('renders "Adicionar co-worker" link', () => {
    render(<AgentsGrid agents={mockAgents} />)
    expect(screen.getByText('Adicionar co-worker')).toBeInTheDocument()
  })

  it('renders with empty agents list', () => {
    render(<AgentsGrid agents={[]} />)
    expect(screen.getByText('Adicionar co-worker')).toBeInTheDocument()
  })

  it('renders workflow counts for agents', () => {
    render(<AgentsGrid agents={mockAgents} />)
    expect(screen.getByText('1 workflow')).toBeInTheDocument()
    expect(screen.getByText('0 workflows')).toBeInTheDocument()
  })

  it('renders section heading', () => {
    render(<AgentsGrid agents={mockAgents} />)
    expect(screen.getByText('Workers')).toBeInTheDocument()
  })
})
