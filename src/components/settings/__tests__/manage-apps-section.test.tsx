import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ManageAppsSection from '@/components/settings/manage-apps-section'

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Mock the server action
vi.mock('@/lib/composio/actions', () => ({
  getAvailableApps: vi.fn().mockResolvedValue([
    { id: 'github', integrationId: 'int_1', name: 'GitHub' },
    { id: 'slack', integrationId: 'int_2', name: 'Slack' },
    { id: 'notion', integrationId: 'int_3', name: 'Notion' },
  ]),
}))

beforeEach(() => {
  // Mock fetch for /api/apps/connections
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ connections: [] }),
    })
  )
})

describe('ManageAppsSection', () => {
  it('renders the heading', async () => {
    render(<ManageAppsSection />)
    expect(screen.getByText('Manage apps')).toBeInTheDocument()
  })

  it('renders app names after loading', async () => {
    render(<ManageAppsSection />)
    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument()
    })
    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.getByText('Notion')).toBeInTheDocument()
  })

  it('filters apps by search query', async () => {
    const user = userEvent.setup()
    render(<ManageAppsSection />)

    // Wait for apps to load
    await waitFor(() => {
      expect(screen.getByText('Slack')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search apps...')
    await user.type(searchInput, 'Slack')

    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('shows empty state when no apps match', async () => {
    const user = userEvent.setup()
    render(<ManageAppsSection />)

    // Wait for apps to load
    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search apps...')
    await user.type(searchInput, 'zzzznonexistent')

    expect(screen.getByText('No apps found matching your search.')).toBeInTheDocument()
  })
})
