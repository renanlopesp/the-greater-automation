import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NotificationsSection from '@/components/settings/notifications-section'

vi.mock('sonner', () => ({
  toast: vi.fn(),
}))

vi.mock('@/hooks/use-notification-preferences', () => ({
  useNotificationPreferences: vi.fn().mockReturnValue({
    preferences: {
      emailEnabled: true,
      failuresEnabled: true,
      digestEnabled: true,
    },
    isLoading: false,
    updatePreference: vi.fn(),
    isUpdating: false,
  }),
}))

describe('NotificationsSection', () => {
  it('renders all notification options', () => {
    render(<NotificationsSection />)
    expect(screen.getByText('Email notifications')).toBeInTheDocument()
    expect(screen.getByText('Workflow run failures')).toBeInTheDocument()
    expect(screen.getByText('Weekly activity digest')).toBeInTheDocument()
  })

  it('renders heading', () => {
    render(<NotificationsSection />)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('renders switches for each option', () => {
    render(<NotificationsSection />)
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)
  })

  it('shows descriptions for each option', () => {
    render(<NotificationsSection />)
    expect(
      screen.getByText('Receive email notifications for important updates')
    ).toBeInTheDocument()
    expect(screen.getByText('Get notified when a workflow run fails')).toBeInTheDocument()
    expect(
      screen.getByText('Receive a weekly summary of your workspace activity')
    ).toBeInTheDocument()
  })
})
