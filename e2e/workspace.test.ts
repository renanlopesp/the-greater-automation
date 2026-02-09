import { test, expect } from '@playwright/test'

test.describe('Workspace page', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/workspace')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page preserves redirect target', async ({ page }) => {
    await page.goto('/workspace')
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fworkspace/)
  })

  test('redirect page renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/workspace')
    await expect(page).toHaveURL(/\/login/)
    expect(errors).toHaveLength(0)
  })
})
