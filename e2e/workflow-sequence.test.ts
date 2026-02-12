import { test, expect } from '@playwright/test'

test.describe('Sequence Step (Sub-Workflow)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('adds sequence step via step selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Sequence/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify the step was added
    await expect(page.getByText('Sequence').first()).toBeVisible()
  })

  test('sequence config panel shows workflow selector', async ({ page }) => {
    // Add sequence step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Sequence/i }).click()

    // Click the step to open config panel
    await page.getByText('Sequence').first().click()

    // Verify config panel shows sub-workflow UI
    await expect(page.getByText('Sub-Workflow')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Select a published workflow')).toBeVisible()
  })

  test('workflow selector loads and shows placeholder when no published workflows', async ({
    page,
  }) => {
    // Add sequence step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Sequence/i }).click()
    await page.getByText('Sequence').first().click()

    // Wait for config panel
    await expect(page.getByText('Sub-Workflow')).toBeVisible({ timeout: 5000 })

    // The selector should show either "Loading..." or "Select a workflow..."
    await expect(page.getByText(/Loading workflows|Select a workflow/).first()).toBeVisible({
      timeout: 5000,
    })
  })

  test('sequence step is not testable without workflow selected', async ({ page }) => {
    // Add sequence step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Sequence/i }).click()
    await page.getByText('Sequence').first().click()

    // Wait for config panel
    await expect(page.getByText('Sub-Workflow')).toBeVisible({ timeout: 5000 })

    // Test button should be disabled (no workflow_id set)
    const testButton = page.getByRole('button', { name: /Test/i })
    await expect(testButton).toBeVisible()
    await expect(testButton).toBeDisabled()
  })

  test('runs workflow with sequence step — falls through when no sub-workflow', async ({
    page,
  }) => {
    // Add sequence step (with no workflow selected — will fail gracefully)
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Sequence/i }).click()

    // Wait for auto-save, publish, run
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /Run/i }).first().click()
    await page.waitForTimeout(1000)

    // Switch to Runs tab
    await page.getByRole('tab', { name: /Runs/i }).click()

    // Verify run shows
    await expect(page.getByText(/[0-1]\/1 steps/)).toBeVisible({ timeout: 10000 })
  })
})
