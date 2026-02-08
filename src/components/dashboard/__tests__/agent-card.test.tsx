import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AgentCard from '@/components/dashboard/agent-card'

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

  it('renders "No skills yet" when no skills', () => {
    render(<AgentCard agent={mockAgent} skills={[]} />)
    expect(screen.getByText('No skills yet')).toBeInTheDocument()
  })

  it('renders skill chips up to 3', () => {
    const skills = [
      { id: '1', name: 'Skill A' },
      { id: '2', name: 'Skill B' },
      { id: '3', name: 'Skill C' },
    ]
    render(<AgentCard agent={mockAgent} skills={skills} />)
    expect(screen.getByText(/Skill A/)).toBeInTheDocument()
    expect(screen.getByText(/Skill B/)).toBeInTheDocument()
    expect(screen.getByText(/Skill C/)).toBeInTheDocument()
  })

  it('renders +N badge when more than 3 skills', () => {
    const skills = [
      { id: '1', name: 'Skill A' },
      { id: '2', name: 'Skill B' },
      { id: '3', name: 'Skill C' },
      { id: '4', name: 'Skill D' },
      { id: '5', name: 'Skill E' },
    ]
    render(<AgentCard agent={mockAgent} skills={skills} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})
