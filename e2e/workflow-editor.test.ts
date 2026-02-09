import { test, expect } from '@playwright/test'

test.describe('Workflow Editor', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/workflows/test-id/edit')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page preserves redirect target with workflow id', async ({ page }) => {
    await page.goto('/workflows/test-id/edit')
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fworkflows%2Ftest-id%2Fedit/)
  })

  test('redirect page renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/workflows/test-id/edit')
    await expect(page).toHaveURL(/\/login/)
    expect(errors).toHaveLength(0)
  })
})
