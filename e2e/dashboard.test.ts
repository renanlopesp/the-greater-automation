import { test, expect } from '@playwright/test'

test.describe('Dashboard page', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('page loads without errors', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to login since no auth
    await expect(page).toHaveURL(/\/login/)
  })
})
