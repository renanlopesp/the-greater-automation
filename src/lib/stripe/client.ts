import Stripe from 'stripe'

let _stripe: Stripe | null = null

/**
 * Get the Stripe SDK singleton instance.
 * Requires STRIPE_SECRET_KEY environment variable.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not configured')
    }
    _stripe = new Stripe(apiKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return _stripe
}
