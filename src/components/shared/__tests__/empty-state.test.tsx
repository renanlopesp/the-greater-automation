import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from '@/components/shared/empty-state'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={<span data-testid="icon">icon</span>}
        title="No items"
        description="Create something new"
      />
    )
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Create something new')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders without description', () => {
    render(<EmptyState icon={<span>icon</span>} title="Empty" />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })

  it('renders action link when provided', () => {
    render(
      <EmptyState
        icon={<span>icon</span>}
        title="Empty"
        action={{ label: 'Create new', href: '/new' }}
      />
    )
    expect(screen.getByText('Create new')).toBeInTheDocument()
  })

  it('renders action button with onClick', () => {
    const onClick = () => {}
    render(
      <EmptyState icon={<span>icon</span>} title="Empty" action={{ label: 'Click me', onClick }} />
    )
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
