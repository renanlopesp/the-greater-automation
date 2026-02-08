import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ManageAppsSection from '@/components/settings/manage-apps-section'

// Mock sonner
vi.mock('sonner', () => ({
  toast: vi.fn(),
}))

describe('ManageAppsSection', () => {
  it('renders the heading', () => {
    render(<ManageAppsSection />)
    expect(screen.getByText('Manage apps')).toBeInTheDocument()
  })

  it('renders app names', () => {
    render(<ManageAppsSection />)
    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Notion')).toBeInTheDocument()
  })

  it('filters apps by search query', async () => {
    const user = userEvent.setup()
    render(<ManageAppsSection />)

    const searchInput = screen.getByPlaceholderText('Search apps...')
    await user.type(searchInput, 'Slack')

    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('shows empty state when no apps match', async () => {
    const user = userEvent.setup()
    render(<ManageAppsSection />)

    const searchInput = screen.getByPlaceholderText('Search apps...')
    await user.type(searchInput, 'zzzznonexistent')

    expect(screen.getByText('No apps found matching your search.')).toBeInTheDocument()
  })
})
