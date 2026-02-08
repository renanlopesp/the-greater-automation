import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RunStatusBadge from '@/components/runs/run-status-badge'

describe('RunStatusBadge', () => {
  it('renders Pending badge', () => {
    render(<RunStatusBadge status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders Running badge with pulse dot', () => {
    render(<RunStatusBadge status="running" />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('renders Completed badge', () => {
    render(<RunStatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders Failed badge', () => {
    render(<RunStatusBadge status="failed" />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders Cancelled badge', () => {
    render(<RunStatusBadge status="cancelled" />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })
})
