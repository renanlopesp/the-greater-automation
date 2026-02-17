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
  it('renders platform navigation links', () => {
    renderSidebar()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Workspace')).toBeInTheDocument()
    expect(screen.getByText('Runs')).toBeInTheDocument()
  })

  it('renders tool menu items', () => {
    renderSidebar()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Integrations')).toBeInTheDocument()
  })

  it('renders theme toggle', () => {
    renderSidebar()
    expect(screen.getByText('Toggle theme')).toBeInTheDocument()
  })

  it('renders user info in footer', () => {
    renderSidebar()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('opens dropdown menu on user button click', async () => {
    const user = userEvent.setup()
    renderSidebar()

    // The user menu button contains the user's name
    const userButtons = screen.getAllByText('Test User')
    // Click the one that is inside the trigger (first occurrence)
    await user.click(userButtons[0])

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Log out')).toBeInTheDocument()
  })

  it('calls onOpenCommandMenu when Search is clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    renderSidebar({ onOpenCommandMenu: onOpen })

    await user.click(screen.getByText('Search'))
    expect(onOpen).toHaveBeenCalled()
  })
})
