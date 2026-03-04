import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import BillingSection from '@/components/settings/billing-section'
import type { PlanData } from '@/types/navigation'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const freePlanData: PlanData = {
  planId: 'free',
  planName: 'Free',
  features: {},
  maxTeamMembers: 1,
  hasStripeSubscription: false,
  cancelAtPeriodEnd: false,
}

const proPlanData: PlanData = {
  planId: 'pro',
  planName: 'Pro',
  features: {},
  maxTeamMembers: 10,
  hasStripeSubscription: true,
  cancelAtPeriodEnd: false,
}

const proCancellingPlanData: PlanData = {
  planId: 'pro',
  planName: 'Pro',
  features: {},
  maxTeamMembers: 10,
  hasStripeSubscription: true,
  cancelAtPeriodEnd: true,
}

describe('BillingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe('Renders with null planData (free defaults)', () => {
    it('renders heading and defaults to Free plan when planData is null', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={null}
        />
      )

      expect(screen.getByRole('heading', { name: 'Cobrança' })).toBeInTheDocument()
      // Current plan summary shows "Gratuito" in the bold plan name span
      expect(screen.getAllByText('Gratuito').length).toBeGreaterThan(0)
      // Free plan description appears in the summary
      expect(screen.getAllByText(/Recursos básicos para indivíduos/i).length).toBeGreaterThan(0)
    })
  })

  describe('Renders current plan name and description', () => {
    it('shows Pro plan name and description in current plan summary', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={500}
          stepsLimit={10000}
          aiCreditsUsed={50}
          aiCreditsLimit={1000}
          planData={proPlanData}
        />
      )

      // The plan name appears multiple times (summary + plan card), just confirm it renders
      expect(screen.getAllByText('Pro').length).toBeGreaterThan(0)

      // Description appears in both summary and plan card
      expect(screen.getAllByText(/Ferramentas avançadas para equipes/i).length).toBeGreaterThan(0)
    })
  })

  describe('Shows usage bars with correct values', () => {
    it('displays steps used and limit', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={250}
          stepsLimit={1000}
          aiCreditsUsed={10.5}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      expect(screen.getByText('Etapas')).toBeInTheDocument()
      expect(screen.getByText('250 / 1,000')).toBeInTheDocument()
    })

    it('displays AI credits used and limit', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={10.5}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      expect(screen.getByText('AI Credits')).toBeInTheDocument()
      expect(screen.getByText('10.50 / 100.00')).toBeInTheDocument()
    })
  })

  describe('Shows "Current plan" badge on active plan card', () => {
    it('shows Current plan badge on the free card when on free plan', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      // "Current plan" appears both in the summary label and as the Badge on the card
      // Verify the Badge element specifically (data-slot="badge")
      const badges = document.querySelectorAll('[data-slot="badge"]')
      const currentPlanBadge = Array.from(badges).find((b) => b.textContent === 'Plano atual')
      expect(currentPlanBadge).toBeTruthy()
    })

    it('shows Current plan badge on the pro card when on pro plan', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={10000}
          aiCreditsUsed={0}
          aiCreditsLimit={1000}
          planData={proPlanData}
        />
      )

      const badges = document.querySelectorAll('[data-slot="badge"]')
      const currentPlanBadge = Array.from(badges).find((b) => b.textContent === 'Plano atual')
      expect(currentPlanBadge).toBeTruthy()

      // Upgrade to Pro button should NOT be present (it's the current plan)
      expect(
        screen.queryByRole('button', { name: 'Fazer upgrade para Pro' })
      ).not.toBeInTheDocument()
    })
  })

  describe('Shows "Upgrade to Pro" button when on free plan', () => {
    it('renders upgrade buttons for higher-tier plans', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      expect(screen.getByRole('button', { name: 'Fazer upgrade para Pro' })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Fazer upgrade para Enterprise' })
      ).toBeInTheDocument()
    })

    it('does not show upgrade button for the current free plan card', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      // Free plan card should show disabled "Current plan" button, not "Upgrade to Free"
      expect(
        screen.queryByRole('button', { name: 'Fazer upgrade para Gratuito' })
      ).not.toBeInTheDocument()
    })
  })

  describe('Shows "Manage subscription" button when hasStripeSubscription', () => {
    it('shows Manage subscription button for current plan with Stripe subscription', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={10000}
          aiCreditsUsed={0}
          aiCreditsLimit={1000}
          planData={proPlanData}
        />
      )

      expect(screen.getByRole('button', { name: 'Gerenciar assinatura' })).toBeInTheDocument()
    })

    it('shows disabled "Current plan" button when no Stripe subscription', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      const currentPlanButton = screen.getByRole('button', { name: 'Plano atual' })
      expect(currentPlanButton).toBeInTheDocument()
      expect(currentPlanButton).toBeDisabled()
    })
  })

  describe('Shows cancellation warning when cancelAtPeriodEnd', () => {
    it('shows cancellation warning when subscription is set to cancel', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={10000}
          aiCreditsUsed={0}
          aiCreditsLimit={1000}
          planData={proCancellingPlanData}
        />
      )

      expect(
        screen.getByText('Sua assinatura será cancelada ao final do período de cobrança atual.')
      ).toBeInTheDocument()
    })

    it('does not show cancellation warning when cancelAtPeriodEnd is false', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={10000}
          aiCreditsUsed={0}
          aiCreditsLimit={1000}
          planData={proPlanData}
        />
      )

      expect(
        screen.queryByText('Sua assinatura será cancelada ao final do período de cobrança atual.')
      ).not.toBeInTheDocument()
    })

    it('does not show cancellation warning when planData is null', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={null}
        />
      )

      expect(
        screen.queryByText('Sua assinatura será cancelada ao final do período de cobrança atual.')
      ).not.toBeInTheDocument()
    })
  })

  describe('Monthly/yearly toggle switches displayed prices', () => {
    it('shows monthly prices by default', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      // Monthly prices: Pro $29, Enterprise $99
      expect(screen.getByText('$29')).toBeInTheDocument()
      expect(screen.getByText('$99')).toBeInTheDocument()
    })

    it('shows yearly prices after clicking Yearly toggle', async () => {
      const user = userEvent.setup()

      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      // Confirm monthly price before toggle
      expect(screen.getByText('$29')).toBeInTheDocument()

      // Click Yearly button
      const yearlyButton = screen.getByRole('button', { name: /Anual/i })
      await user.click(yearlyButton)

      // After toggling, yearly prices should show: Pro $23, Enterprise $79
      await waitFor(() => {
        expect(screen.getByText('$23')).toBeInTheDocument()
        expect(screen.getByText('$79')).toBeInTheDocument()
      })

      // Monthly prices should no longer be visible for paid plans
      expect(screen.queryByText('$29')).not.toBeInTheDocument()
    })

    it('shows Save 20% badge on Yearly toggle button', () => {
      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      expect(screen.getByText('Economize 20%')).toBeInTheDocument()
    })
  })

  describe('Clicking upgrade calls fetch with correct checkout payload', () => {
    it('calls POST /api/stripe/checkout with planId and interval on upgrade click', async () => {
      const user = userEvent.setup()

      const mockFetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      // Mock window.location.href setter
      const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        href: '',
      } as Location)

      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      const upgradeButton = screen.getByRole('button', { name: 'Fazer upgrade para Pro' })
      await user.click(upgradeButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: 'pro', interval: 'monthly' }),
        })
      })

      locationSpy.mockRestore()
    })

    it('calls POST /api/stripe/checkout with yearly interval when Yearly is selected', async () => {
      const user = userEvent.setup()

      const mockFetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      // Switch to yearly
      const yearlyButton = screen.getByRole('button', { name: /Anual/i })
      await user.click(yearlyButton)

      const upgradeButton = screen.getByRole('button', { name: 'Fazer upgrade para Pro' })
      await user.click(upgradeButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: 'pro', interval: 'yearly' }),
        })
      })
    })

    it('shows error toast when checkout fetch returns error', async () => {
      const user = userEvent.setup()
      const { toast } = await import('sonner')

      const mockFetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ error: 'Payment failed' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      renderWithQuery(
        <BillingSection
          stepsUsed={0}
          stepsLimit={1000}
          aiCreditsUsed={0}
          aiCreditsLimit={100}
          planData={freePlanData}
        />
      )

      const upgradeButton = screen.getByRole('button', { name: 'Fazer upgrade para Pro' })
      await user.click(upgradeButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Payment failed')
      })
    })
  })
})
