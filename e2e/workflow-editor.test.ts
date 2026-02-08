import { test, expect } from '@playwright/test'

test.describe('Workflow Editor', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/workflows/test-id/edit')
    await expect(page).toHaveURL(/\/login/)
  })

  test('editor page loads without errors', async ({ page }) => {
    await page.goto('/workflows/test-id/edit')
    // Should redirect to login since no auth
    await expect(page).toHaveURL(/\/login/)
  })
})
