import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { format } from 'date-fns'
import ActivityHeatmap from '../activity-heatmap'

describe('ActivityHeatmap', () => {
  it('renders a calendar grid', () => {
    const data = new Map<string, number>()
    const { container } = render(<ActivityHeatmap data={data} />)
    const cells = container.querySelectorAll('[data-day-cell]')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('highlights days with activity', () => {
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const data = new Map<string, number>([[key, 7]])
    const { container } = render(<ActivityHeatmap data={data} />)
    const active = Array.from(container.querySelectorAll('[data-day-cell]')).find((el) =>
      el.className.includes('text-primary')
    )
    expect(active).toBeTruthy()
  })

  it('renders month labels', () => {
    const data = new Map<string, number>()
    render(<ActivityHeatmap data={data} />)
    const today = new Date()
    // Component renders only the current month
    const label = format(today, 'MMMM yyyy')
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('renders day-of-week labels', () => {
    const data = new Map<string, number>()
    render(<ActivityHeatmap data={data} />)
    // Each of 5 months has its own S M T W T F S labels
    expect(screen.getAllByText('S').length).toBeGreaterThan(0)
    expect(screen.getAllByText('M').length).toBeGreaterThan(0)
    expect(screen.getAllByText('W').length).toBeGreaterThan(0)
    expect(screen.getAllByText('F').length).toBeGreaterThan(0)
  })
})
