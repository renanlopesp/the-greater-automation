import { test, expect } from '@playwright/test'

test.describe('Command Menu', () => {
  // Without auth, we can only test that the pages redirect properly.
  // Full command menu e2e tests require an authenticated session.

  test('Ctrl+K does not open command menu on unauthenticated page', async ({ page }) => {
    // Visit homepage (which doesn't have the command menu)
    await page.goto('/')
    await page.keyboard.press('Control+k')

    // No command dialog should appear on the public page
    const dialog = page.getByRole('dialog')
    await expect(dialog).not.toBeVisible()
  })
})
