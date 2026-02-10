import { test, expect } from '@playwright/test'

test.describe('Workflow Runs Tab', () => {
  test.beforeEach(async ({ page }) => {
    // Create a fresh workflow
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('runs tab shows empty state for new workflow', async ({ page }) => {
    await page.getByRole('tab', { name: /Runs/i }).click()
    await expect(page.getByText('No runs yet')).toBeVisible()
    await expect(page.getByText('Start your first workflow run')).toBeVisible()
    await expect(page.getByRole('button', { name: /Run now/i })).toBeVisible()
  })

  test('switching tabs preserves state', async ({ page }) => {
    // Add a step in Editor tab
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI/ }).click()
    await expect(page.getByText('AI').first()).toBeVisible()

    // Switch to Runs
    await page.getByRole('tab', { name: /Runs/i }).click()
    await expect(page.getByText('No runs yet')).toBeVisible()

    // Switch back — step should still be there
    await page.getByRole('tab', { name: /Editor/i }).click()
    await expect(page.getByText('AI').first()).toBeVisible()
  })
})

test.describe('Workflow Editor - Header Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('publish button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Publish/i })).toBeVisible()
  })

  test('run button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Run/i }).first()).toBeVisible()
  })

  test('sharing button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Sharing/i })).toBeVisible()
  })

  test('opens sharing dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Sharing/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('opens more menu with export and delete', async ({ page }) => {
    // Click the more (three dots) button — it's right after the Sharing button
    const moreButton = page
      .getByRole('button', { name: 'Sharing' })
      .locator('xpath=following-sibling::button[1]')
    await moreButton.click()

    await expect(page.getByRole('menuitem', { name: /Export JSON/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Delete workflow/i })).toBeVisible()
  })
})

test.describe('Workflow Editor - AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('opens assistant panel via floating button', async ({ page }) => {
    // Click the floating assistant button (bottom-left gradient circle)
    await page.getByRole('button', { name: /Open assistant/i }).click()

    // Assistant panel should appear with title and use cases
    await expect(page.getByText('Relay.app Assistant')).toBeVisible()
    await expect(page.getByText('What can I help you build?')).toBeVisible()
  })

  test('shows use case cards', async ({ page }) => {
    await page.getByRole('button', { name: /Open assistant/i }).click()
    await expect(page.getByText('Relay.app Assistant')).toBeVisible()

    // Verify all 4 use case cards
    await expect(page.getByText('Meeting briefings')).toBeVisible()
    await expect(page.getByText('Competitor analysis')).toBeVisible()
    await expect(page.getByText('Email assistant')).toBeVisible()
    await expect(page.getByText('YouTube summarizer')).toBeVisible()
  })

  test('has message input with placeholder', async ({ page }) => {
    await page.getByRole('button', { name: /Open assistant/i }).click()
    await expect(page.getByPlaceholder('Describe a workflow or ask a question')).toBeVisible()
  })

  test('sends a message and gets response', async ({ page }) => {
    await page.getByRole('button', { name: /Open assistant/i }).click()

    const input = page.getByPlaceholder('Describe a workflow or ask a question')
    await input.fill('Build a workflow for daily briefings')
    await input.press('Enter')

    // Should show loading state
    await expect(page.getByText('Thinking...')).toBeVisible()

    // Wait for response (API returns mock data)
    await expect(page.getByText('Thinking...')).not.toBeVisible({ timeout: 15000 })

    // User message should be visible
    await expect(page.getByText('Build a workflow for daily briefings')).toBeVisible()
  })
})
