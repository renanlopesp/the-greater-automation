import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AppSidebar from '@/components/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}))

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}))

// Mock workspace action
vi.mock('@/lib/actions/workspace', () => ({
  switchWorkspaceAction: vi.fn(),
}))

const mockUser = {
  id: '123',
  email: 'test@example.com',
  fullName: 'Test User',
  avatarUrl: null,
}

const mockTeam = { id: 'team-1', name: 'Test Team', slug: 'test-team' }
const mockUserTeams = [{ id: 'team-1', name: 'Test Team', role: 'owner' }]

function renderSidebar(props = {}) {
  return render(
    <SidebarProvider>
      <AppSidebar
        user={mockUser}
        team={mockTeam}
        userTeams={mockUserTeams}
        usage={null}
        {...props}
      />
    </SidebarProvider>
  )
}

describe('AppSidebar', () => {
  it('renders navigation links', () => {
    renderSidebar()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Co-workers')).toBeInTheDocument()
    expect(screen.getByText('Apps')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
  })

  it('renders footer items', () => {
    renderSidebar()
    expect(screen.getByText('Discover')).toBeInTheDocument()
  })

  it('renders theme toggle in dropdown', async () => {
    const user = userEvent.setup()
    renderSidebar()

    // Open the user dropdown
    const userButton = screen.getByText('Test User')
    await user.click(userButton)

    expect(screen.getByText('Modo escuro')).toBeInTheDocument()
  })

  it('renders user info in header', () => {
    renderSidebar()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('TU')).toBeInTheDocument()
  })

  it('opens dropdown menu on user button click', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const userButton = screen.getByText('Test User')
    await user.click(userButton)

    expect(screen.getByText('Configurações da conta')).toBeInTheDocument()
    expect(screen.getByText('Sair')).toBeInTheDocument()
  })

  it('shows workspace list in dropdown', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const userButton = screen.getByText('Test User')
    await user.click(userButton)

    expect(screen.getByText('Workspaces')).toBeInTheDocument()
    expect(screen.getByText('Test Team')).toBeInTheDocument()
  })
})
