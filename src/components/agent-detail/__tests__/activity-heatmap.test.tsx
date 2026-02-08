import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ActivityHeatmap from '../activity-heatmap'

describe('ActivityHeatmap', () => {
  it('renders grid cells', () => {
    const data = new Map<string, number>()
    const { container } = render(<ActivityHeatmap data={data} />)
    const cells = container.querySelectorAll('.h-3.w-3.rounded-sm')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('applies correct colors for different counts', () => {
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const data = new Map<string, number>([[key, 7]])
    const { container } = render(<ActivityHeatmap data={data} />)
    const blueCell = container.querySelector('.bg-blue-600')
    expect(blueCell).toBeInTheDocument()
  })

  it('renders month labels', () => {
    const data = new Map<string, number>()
    render(<ActivityHeatmap data={data} />)
    // Should have at least some month abbreviations
    const monthLabels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const foundLabels = monthLabels.filter((m) => screen.queryByText(m))
    expect(foundLabels.length).toBeGreaterThanOrEqual(2)
  })

  it('renders day-of-week labels', () => {
    const data = new Map<string, number>()
    render(<ActivityHeatmap data={data} />)
    // Shows alternating day labels (M, W, F)
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('W')).toBeInTheDocument()
    expect(screen.getByText('F')).toBeInTheDocument()
  })

  it('renders with empty data (all muted)', () => {
    const data = new Map<string, number>()
    const { container } = render(<ActivityHeatmap data={data} />)
    const mutedCells = container.querySelectorAll('.bg-muted')
    expect(mutedCells.length).toBeGreaterThan(0)
  })
})
