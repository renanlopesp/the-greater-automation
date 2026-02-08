import { test, expect } from '@playwright/test'

test.describe('Settings Dialog', () => {
  // Settings dialog is only available when authenticated.
  // Without auth infrastructure for e2e, we verify the auth gate works.

  test('unauthenticated user cannot access dashboard to open settings', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
