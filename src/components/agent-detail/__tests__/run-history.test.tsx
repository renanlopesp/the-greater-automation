import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RunHistory from '../run-history'

const mockRuns = [
  {
    id: 'r1',
    status: 'completed',
    steps_used: 5,
    ai_credits_used: 2.5,
    started_at: new Date(Date.now() - 7_200_000).toISOString(),
    completed_at: new Date(Date.now() - 3_600_000).toISOString(),
    workflow: { name: 'Email Flow', emoji: '📧' },
  },
  {
    id: 'r2',
    status: 'failed',
    steps_used: 3,
    ai_credits_used: 1.0,
    started_at: new Date(Date.now() - 86_400_000).toISOString(),
    completed_at: null,
    workflow: { name: 'Data Pipeline', emoji: '🔄' },
  },
  {
    id: 'r3',
    status: 'running',
    steps_used: 1,
    ai_credits_used: 0.5,
    started_at: new Date(Date.now() - 60_000).toISOString(),
    completed_at: null,
    workflow: null,
  },
]

describe('RunHistory', () => {
  it('renders empty state when no runs', () => {
    render(<RunHistory runs={[]} />)
    expect(screen.getByText('Nenhuma execução ainda')).toBeInTheDocument()
  })

  it('renders status badges', () => {
    render(<RunHistory runs={mockRuns} />)
    // Filter buttons also render these labels, so expect multiple matches
    expect(screen.getAllByText('Concluído').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Falhou').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Em execução').length).toBeGreaterThanOrEqual(2)
  })

  it('renders workflow names with emojis', () => {
    render(<RunHistory runs={mockRuns} />)
    expect(screen.getByText(/Email Flow/)).toBeInTheDocument()
    expect(screen.getByText(/Data Pipeline/)).toBeInTheDocument()
  })

  it('shows "Unknown" for null workflow', () => {
    render(<RunHistory runs={mockRuns} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('shows duration for completed runs', () => {
    render(<RunHistory runs={mockRuns} />)
    // First run has a 1-hour duration — text is within a larger string
    expect(screen.getByText(/1h/)).toBeInTheDocument()
  })
})
