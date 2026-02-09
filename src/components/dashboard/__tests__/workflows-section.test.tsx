import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkflowsSection from '@/components/dashboard/workflows-section'

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  })),
}))

const mockWorkflows = [
  {
    id: 'w1',
    name: 'Email Triage',
    emoji: '📧',
    status: 'published' as const,
    is_starred: true,
    updated_at: '2026-02-08T12:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'w2',
    name: 'Data Pipeline',
    emoji: '🔄',
    status: 'draft' as const,
    is_starred: false,
    updated_at: '2026-02-07T12:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
]

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('WorkflowsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders workflow list items', () => {
    renderWithProviders(<WorkflowsSection initialWorkflows={mockWorkflows} teamId="team-1" />)
    expect(screen.getAllByText('Email Triage').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Data Pipeline').length).toBeGreaterThan(0)
  })

  it('renders all 4 tab triggers', () => {
    renderWithProviders(<WorkflowsSection initialWorkflows={mockWorkflows} teamId="team-1" />)
    expect(screen.getByRole('tab', { name: 'Needs attention' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Recently edited' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Recently run' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Starred' })).toBeInTheDocument()
  })

  it('renders "View all" link to workspace', () => {
    renderWithProviders(<WorkflowsSection initialWorkflows={mockWorkflows} teamId="team-1" />)
    const viewAllLinks = screen.getAllByText('View all')
    expect(viewAllLinks.length).toBeGreaterThan(0)
  })

  it('renders Workflows heading', () => {
    renderWithProviders(<WorkflowsSection initialWorkflows={mockWorkflows} teamId="team-1" />)
    expect(screen.getByText('Workflows')).toBeInTheDocument()
  })

  it('shows empty state when no workflows', () => {
    renderWithProviders(<WorkflowsSection initialWorkflows={[]} teamId="team-1" />)
    expect(screen.getByText('No workflows found')).toBeInTheDocument()
  })
})
