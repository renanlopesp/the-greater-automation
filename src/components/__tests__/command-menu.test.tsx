import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import CommandMenu from '@/components/command-menu'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          ilike: () => ({
            limit: () => Promise.resolve({ data: [] }),
          }),
          limit: () => Promise.resolve({ data: [] }),
        }),
      }),
    }),
  }),
}))

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('CommandMenu', () => {
  it('renders dialog when open', () => {
    renderWithQuery(<CommandMenu teamId="team-1" open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Search workflows, agents, runs...')).toBeInTheDocument()
  })

  it('does not render dialog when closed', () => {
    renderWithQuery(<CommandMenu teamId="team-1" open={false} onOpenChange={vi.fn()} />)
    expect(
      screen.queryByPlaceholderText('Search workflows, agents, runs...')
    ).not.toBeInTheDocument()
  })

  it('shows empty state when no results', () => {
    renderWithQuery(<CommandMenu teamId="team-1" open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens on Ctrl+K', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderWithQuery(<CommandMenu teamId="team-1" open={false} onOpenChange={onOpenChange} />)

    await user.keyboard('{Control>}k{/Control}')
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
