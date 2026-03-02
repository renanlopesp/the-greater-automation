import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ManageAppsSection from '@/components/settings/manage-apps-section'

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: {
      connections: [],
      availableApps: [
        { id: 'github', integrationId: 'int_1', name: 'GitHub' },
        { id: 'slack', integrationId: 'int_2', name: 'Slack' },
        { id: 'notion', integrationId: 'int_3', name: 'Notion' },
      ],
      composioApps: [
        {
          id: 'github',
          name: 'GitHub',
          logoUrl: '',
          iconSlug: 'github',
          category: 'Development',
          authType: 'oauth',
          hasTriggers: true,
        },
        {
          id: 'slack',
          name: 'Slack',
          logoUrl: '',
          iconSlug: 'slack',
          category: 'Communication',
          authType: 'oauth',
          hasTriggers: true,
        },
        {
          id: 'notion',
          name: 'Notion',
          logoUrl: '',
          iconSlug: 'notion',
          category: 'Productivity',
          authType: 'oauth',
          hasTriggers: false,
        },
      ],
    },
    isLoading: false,
  }),
  useQueryClient: vi.fn().mockReturnValue({
    invalidateQueries: vi.fn(),
  }),
}))

describe('ManageAppsSection', () => {
  it('renders the heading', () => {
    render(<ManageAppsSection />)
    expect(screen.getByText('Aplicativos')).toBeInTheDocument()
  })

  it('renders app names after loading', () => {
    render(<ManageAppsSection />)
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.getByText('Notion')).toBeInTheDocument()
  })

  it('filters apps by search query', async () => {
    const user = userEvent.setup()
    render(<ManageAppsSection />)

    const searchInput = screen.getByPlaceholderText('Buscar aplicativos...')
    await user.type(searchInput, 'Slack')

    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('shows empty state when no apps match', async () => {
    const user = userEvent.setup()
    render(<ManageAppsSection />)

    const searchInput = screen.getByPlaceholderText('Buscar aplicativos...')
    await user.type(searchInput, 'zzzznonexistent')

    expect(screen.getByText('Nenhum aplicativo encontrado para sua busca.')).toBeInTheDocument()
  })
})
