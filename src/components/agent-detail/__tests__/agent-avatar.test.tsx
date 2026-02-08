import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AgentAvatar from '../agent-avatar'

describe('AgentAvatar', () => {
  it('renders 24x24 grid of dots', () => {
    const { container } = render(<AgentAvatar />)
    const dots = container.querySelectorAll('.rounded-full.bg-white')
    expect(dots).toHaveLength(576) // 24 * 24
  })

  it('renders with default size', () => {
    const { container } = render(<AgentAvatar />)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.style.width).toBe('120px')
    expect(outer.style.height).toBe('120px')
  })

  it('renders with custom size', () => {
    const { container } = render(<AgentAvatar size={80} />)
    const outer = container.firstElementChild as HTMLElement
    expect(outer.style.width).toBe('80px')
    expect(outer.style.height).toBe('80px')
  })

  it('applies animation to dots', () => {
    const { container } = render(<AgentAvatar />)
    const dot = container.querySelector('.rounded-full.bg-white') as HTMLElement
    expect(dot.style.animation).toContain('agent-dot-pulse')
  })
})
