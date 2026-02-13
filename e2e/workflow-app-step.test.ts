import { test, expect } from '@playwright/test'

test.describe('Workflow Editor - App Step', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('adds an App step and sees app selection grid', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^App /i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Click the App step to open config panel
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()
    await expect(page.getByText('Perform an action in a connected application')).toBeVisible()

    // Should show app selection grid with 5 apps
    await expect(page.getByText('Select App')).toBeVisible()
    await expect(page.getByText('GitHub')).toBeVisible()
    await expect(page.getByText('Notion')).toBeVisible()
    await expect(page.getByText('Slack')).toBeVisible()
    await expect(page.getByText('LinkedIn')).toBeVisible()
    await expect(page.getByText('Discord')).toBeVisible()
  })

  test('selects GitHub and sees action dropdown', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    // Select GitHub
    await page.getByRole('button', { name: /GitHub/i }).click()

    // Action dropdown should appear
    await expect(page.getByText('Action')).toBeVisible()
  })

  test('selects GitHub Create Issue action and sees dynamic inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    // Select GitHub
    await page.getByRole('button', { name: /GitHub/i }).click()

    // Select Create Issue action
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: /Create Issue/i }).click()

    // Dynamic fields should appear
    await expect(page.getByText('Configuration')).toBeVisible()
    await expect(page.getByText('Owner')).toBeVisible()
    await expect(page.getByText('Repository')).toBeVisible()
    await expect(page.getByText('Title')).toBeVisible()
  })

  test('selects Slack and sees different actions', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    // Select Slack
    await page.getByRole('button', { name: /Slack/i }).click()

    // Action dropdown should appear
    await expect(page.getByText('Action')).toBeVisible()
  })

  test('switching app clears selected action', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    // Select GitHub first
    await page.getByRole('button', { name: /GitHub/i }).click()

    // Select an action
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: /Create Issue/i }).click()
    await expect(page.getByText('Configuration')).toBeVisible()

    // Switch to Slack - should clear action and inputs
    await page.getByRole('button', { name: /Slack/i }).click()

    // Configuration section should be gone (no action selected yet)
    await expect(page.getByText('Configuration')).not.toBeVisible()
  })
})
