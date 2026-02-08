import { test, expect } from '@playwright/test'

test.describe('Workflow Editor Panels', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/workflows/test-id/edit')
    await expect(page).toHaveURL(/\/login/)
  })
})
