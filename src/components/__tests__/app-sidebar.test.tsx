import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AppSidebar from '@/components/app-sidebar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}))

const mockUser = {
  id: '123',
  email: 'test@example.com',
  fullName: 'Test User',
  avatarUrl: null,
}

const mockUsage = {
  stepsUsed: 50,
  stepsLimit: 100,
  aiCreditsUsed: 25,
  aiCreditsLimit: 100,
}

describe('AppSidebar', () => {
  it('renders all navigation icons', () => {
    render(<AppSidebar user={mockUser} usage={mockUsage} />)
    // 6 nav items rendered as links
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(6)
  })

  it('highlights the active route', () => {
    render(<AppSidebar user={mockUser} usage={mockUsage} />)
    const activeLink = screen.getByRole('link', { current: 'page' })
    expect(activeLink).toBeInTheDocument()
  })

  it('renders usage meters', () => {
    render(<AppSidebar user={mockUser} usage={mockUsage} />)
    expect(screen.getByText('Steps')).toBeInTheDocument()
    expect(screen.getByText('AI Credits')).toBeInTheDocument()
  })

  it('renders avatar with initials fallback', () => {
    render(<AppSidebar user={mockUser} usage={mockUsage} />)
    expect(screen.getByText('TU')).toBeInTheDocument()
  })

  it('opens dropdown menu on avatar click', async () => {
    const user = userEvent.setup()
    render(<AppSidebar user={mockUser} usage={mockUsage} />)

    const avatarButton = screen.getByRole('button', { name: 'TU' })
    await user.click(avatarButton)

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Log out')).toBeInTheDocument()
  })

  it('calls onOpenCommandMenu when Search is clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<AppSidebar user={mockUser} usage={mockUsage} onOpenCommandMenu={onOpen} />)

    // Find the search link by its tooltip
    const searchLinks = screen.getAllByRole('link')
    const searchLink = searchLinks.find((link) => link.getAttribute('href') === '#')
    if (searchLink) {
      await user.click(searchLink)
      expect(onOpen).toHaveBeenCalled()
    }
  })
})
