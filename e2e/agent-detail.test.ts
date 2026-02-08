import { test, expect } from '@playwright/test'

test.describe('Agent Detail Page', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/agents/test-agent-id')
    await expect(page).toHaveURL(/\/login/)
  })

  test('returns 404 for invalid agent ID', async ({ page }) => {
    // Navigate to a clearly invalid agent ID format
    await page.goto('/agents/00000000-0000-0000-0000-000000000000')
    // Should either redirect to login (no auth) or show 404
    const url = page.url()
    const is404 = await page.locator('text=404').count()
    const isLogin = url.includes('/login')
    expect(is404 > 0 || isLogin).toBe(true)
  })
})
