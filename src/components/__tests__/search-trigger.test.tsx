import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SearchTrigger from '@/components/search-trigger'

describe('SearchTrigger', () => {
  it('renders with search text', () => {
    render(<SearchTrigger onOpen={vi.fn()} />)
    // Text is now split across multiple elements: "Type" + <kbd> + "to search"
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('to search')).toBeInTheDocument()
  })

  it('calls onOpen when clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<SearchTrigger onOpen={onOpen} />)

    await user.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledOnce()
  })
})
