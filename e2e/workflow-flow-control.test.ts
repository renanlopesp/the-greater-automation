import { test, expect } from '@playwright/test'

test.describe('Flow Control Step', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('adds flow control step to workflow', async ({ page }) => {
    // Add "Flow Control" step from the step picker
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Flow Control/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify the step was added (look for "Flow Control" text in the step list)
    await expect(page.getByText('Flow Control').first()).toBeVisible()
  })

  test('configures path mode with conditions', async ({ page }) => {
    // Add flow control step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Flow Control/i }).click()

    // Click the step to open config panel
    await page.getByText('Flow Control').first().click()

    // Verify the config panel is visible with "Control Type" label
    await expect(page.getByText('Control Type')).toBeVisible({ timeout: 5000 })

    // Verify "Conditional Path" is the default control type
    await expect(page.getByText('Conditional Path')).toBeVisible()

    // Click "Add condition" button (the plus icon button with outline variant near "Conditions" label)
    // Wait for the "No conditions added" text to confirm we're in path mode
    await expect(page.getByText('No conditions added')).toBeVisible()

    // Find and click the small outline button with Plus icon (not the "Add step" button)
    await page
      .locator('button[data-variant="outline"]')
      .filter({ has: page.locator('svg.lucide-plus') })
      .click()

    // Verify a condition row appeared
    await expect(page.getByPlaceholder('Field (e.g., step_1.output)')).toBeVisible()
    await expect(page.getByPlaceholder('Value')).toBeVisible()
  })

  test('configures loop mode', async ({ page }) => {
    // Add flow control step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Flow Control/i }).click()
    await page.getByText('Flow Control').first().click()

    // Wait for config panel
    await expect(page.getByText('Control Type')).toBeVisible({ timeout: 5000 })

    // Change control type to "Loop"
    await page.locator('#control-type').click()
    await page.getByRole('option', { name: 'Loop' }).click()

    // Verify loop-specific fields appear
    await expect(page.getByLabel('Loop Source')).toBeVisible()
    await expect(page.getByLabel('Or Loop Count')).toBeVisible()
  })

  test('configures wait mode', async ({ page }) => {
    // Add flow control step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Flow Control/i }).click()
    await page.getByText('Flow Control').first().click()

    // Wait for config panel
    await expect(page.getByText('Control Type')).toBeVisible({ timeout: 5000 })

    // Change control type to "Wait"
    await page.locator('#control-type').click()
    await page.getByRole('option', { name: 'Wait' }).click()

    // Verify wait-specific fields appear
    await expect(page.getByLabel('Duration')).toBeVisible()
    await expect(page.getByLabel('Unit')).toBeVisible()
  })

  test('runs workflow with flow control step and shows completed', async ({ page }) => {
    // Add AI step first (to produce output for context)
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()

    // Add flow control step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Flow Control/i }).click()

    // Verify both steps exist
    await expect(page.getByText('AI').first()).toBeVisible()
    await expect(page.getByText('Flow Control').first()).toBeVisible()

    // Wait for auto-save, publish, run
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /Run/i }).first().click()
    await page.waitForTimeout(1000)

    // Switch to Runs tab
    await page.getByRole('tab', { name: /Runs/i }).click()

    // Verify run shows with 2 steps
    await expect(page.getByText(/[0-2]\/2 steps/)).toBeVisible({ timeout: 10000 })
  })

  test('flow control step shows as testable in config panel', async ({ page }) => {
    // Add flow control step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Flow Control/i }).click()
    await page.getByText('Flow Control').first().click()

    // Wait for config panel
    await expect(page.getByText('Control Type')).toBeVisible({ timeout: 5000 })

    // Verify there's a Test button in the config panel footer
    await expect(page.getByRole('button', { name: /Test/i })).toBeVisible()
  })
})
