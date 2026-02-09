import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AgentAvatar from '../agent-avatar'

describe('AgentAvatar', () => {
  it('renders initials from name', () => {
    render(<AgentAvatar name="Data Scout" />)
    expect(screen.getByText('DS')).toBeInTheDocument()
  })

  it('renders single initial for single-word name', () => {
    render(<AgentAvatar name="Scout" />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders default fallback when no name provided', () => {
    render(<AgentAvatar />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
