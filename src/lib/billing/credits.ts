/**
 * Token-to-credit conversion.
 *
 * 1 AI credit = 1,000 tokens.
 * This keeps the free plan (100 credits) usable for ~100K tokens of API usage.
 */
export const TOKENS_PER_CREDIT = 1000

/** Convert raw token count to AI credits (rounded to 2 decimal places). */
export function tokensToCredits(tokens: number): number {
  return Math.round((tokens / TOKENS_PER_CREDIT) * 100) / 100
}
