import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SearchTrigger from '@/components/search-trigger'

describe('SearchTrigger', () => {
  it('renders with search text', () => {
    render(<SearchTrigger onOpen={vi.fn()} />)
    expect(screen.getByText('Type Ctrl K to search')).toBeInTheDocument()
  })

  it('calls onOpen when clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<SearchTrigger onOpen={onOpen} />)

    await user.click(screen.getByText('Type Ctrl K to search'))
    expect(onOpen).toHaveBeenCalledOnce()
  })
})
