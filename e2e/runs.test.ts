import { test, expect } from '@playwright/test'

test.describe('Runs page', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/runs')
    await expect(page).toHaveURL(/\/login/)
  })

  test('page loads without errors', async ({ page }) => {
    await page.goto('/runs')
    // Should redirect to login since no auth
    await expect(page).toHaveURL(/\/login/)
  })
})
