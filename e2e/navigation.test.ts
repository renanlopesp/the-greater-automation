import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('unauthenticated user is redirected to /login from /dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from /workspace', async ({ page }) => {
    await page.goto('/workspace')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from /runs', async ({ page }) => {
    await page.goto('/runs')
    await expect(page).toHaveURL(/\/login/)
  })
})
