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
    expect(screen.getByText('Notificações por e-mail')).toBeInTheDocument()
    expect(screen.getByText('Falhas em automações')).toBeInTheDocument()
    expect(screen.getByText('Resumo semanal de atividades')).toBeInTheDocument()
  })

  it('renders heading', () => {
    render(<NotificationsSection />)
    expect(screen.getByText('Notificações')).toBeInTheDocument()
  })

  it('renders switches for each option', () => {
    render(<NotificationsSection />)
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)
  })

  it('shows descriptions for each option', () => {
    render(<NotificationsSection />)
    expect(
      screen.getByText('Receba notificações por e-mail sobre atualizações importantes')
    ).toBeInTheDocument()
    expect(screen.getByText('Seja notificado quando uma automação falhar')).toBeInTheDocument()
    expect(
      screen.getByText('Receba um resumo semanal das atividades do seu workspace')
    ).toBeInTheDocument()
  })
})
