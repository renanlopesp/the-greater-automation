import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressIndicators from '../progress-indicators'

describe('ProgressIndicators', () => {
  it('renders steps and AI credits labels', () => {
    render(
      <ProgressIndicators
        stepsUsed={50}
        stepsLimit={1000}
        aiCreditsUsed={25}
        aiCreditsLimit={100}
      />
    )
    expect(screen.getByText('Steps')).toBeInTheDocument()
    expect(screen.getByText('AI credits')).toBeInTheDocument()
  })

  it('renders usage counts', () => {
    render(
      <ProgressIndicators
        stepsUsed={50}
        stepsLimit={1000}
        aiCreditsUsed={25}
        aiCreditsLimit={100}
      />
    )
    expect(screen.getByText('50 / 1000')).toBeInTheDocument()
    expect(screen.getByText('25 / 100')).toBeInTheDocument()
  })

  it('handles zero limits without division by zero', () => {
    render(<ProgressIndicators stepsUsed={0} stepsLimit={0} aiCreditsUsed={0} aiCreditsLimit={0} />)
    // Should render without errors - both rows show "0 / 0"
    expect(screen.getAllByText('0 / 0')).toHaveLength(2)
  })
})
