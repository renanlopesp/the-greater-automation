import { test, expect } from '@playwright/test'

test.describe('Notification System', () => {
  test.describe('Workflow Editor Notifications', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to workspace and open a workflow
      await page.goto('/workspace')
      await page.getByRole('button', { name: 'New workflow' }).click()
      await page.waitForURL(/\/workflows\/[a-f0-9-]+\/edit$/, { timeout: 15000 })
    })

    test('shows notification bell icon in editor header', async ({ page }) => {
      // The bell icon should be visible in the editor header
      const bellButton = page
        .locator('[aria-label="Notifications"]')
        .or(page.locator('button').filter({ has: page.locator('svg.lucide-bell') }))
      // There should be at least one bell icon visible
      await expect(bellButton.first()).toBeVisible({ timeout: 5000 })
    })

    test('opens notification popover on bell click', async ({ page }) => {
      // Click the bell icon to open the popover
      const bellButton = page.locator('button').filter({ has: page.locator('svg.lucide-bell') })
      await bellButton.first().click({ force: true })

      // Wait for the popover to appear
      await expect(page.getByText('Notifications')).toBeVisible({ timeout: 5000 })
    })

    test('shows empty state or notifications in popover', async ({ page }) => {
      // Click the bell icon
      const bellButton = page.locator('button').filter({ has: page.locator('svg.lucide-bell') })
      await bellButton.first().click({ force: true })

      // Should show either "No notifications" or "Mark all as read"
      const emptyState = page.getByText('No notifications')
      const markAllRead = page.getByText('Mark all as read')

      // One of these should be visible
      await expect(emptyState.or(markAllRead)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Dashboard Notifications', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    test('shows notification bell in dashboard header', async ({ page }) => {
      const bellButton = page.locator('button').filter({ has: page.locator('svg.lucide-bell') })
      await expect(bellButton.first()).toBeVisible({ timeout: 5000 })
    })

    test('opens notification popover from dashboard', async ({ page }) => {
      const bellButton = page.locator('button').filter({ has: page.locator('svg.lucide-bell') })
      await bellButton.first().click({ force: true })

      await expect(page.getByText('Notifications')).toBeVisible({ timeout: 5000 })
    })
  })
})
