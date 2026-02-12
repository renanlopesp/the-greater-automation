import { test, expect } from '@playwright/test'

test.describe('Utility Step', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('adds utility step via step selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Utility/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify the step was added
    await expect(page.getByText('Utility').first()).toBeVisible()
  })

  test('configures format type with template', async ({ page }) => {
    // Add utility step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Utility/i }).click()

    // Click the step to open config panel
    await page.getByText('Utility').first().click()

    // Verify config panel shows with "Utility Type" label
    await expect(page.getByText('Utility Type')).toBeVisible({ timeout: 5000 })

    // Verify "Format data" is the default type
    await expect(page.getByText('Format data')).toBeVisible()

    // Verify format_template field is visible
    await expect(page.getByLabel(/Format Template/i)).toBeVisible()
  })

  test('configures math type — verify conditional fields', async ({ page }) => {
    // Add utility step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Utility/i }).click()
    await page.getByText('Utility').first().click()

    // Wait for config panel
    await expect(page.getByText('Utility Type')).toBeVisible({ timeout: 5000 })

    // Change utility type to "Math"
    await page.locator('#utility-type').click()
    await page.getByRole('option', { name: 'Math' }).click()

    // Verify math-specific field appears
    await expect(page.getByLabel(/Math Expression/i)).toBeVisible()
  })

  test('configures parse_json — verify only input_source shown', async ({ page }) => {
    // Add utility step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Utility/i }).click()
    await page.getByText('Utility').first().click()

    // Wait for config panel
    await expect(page.getByText('Utility Type')).toBeVisible({ timeout: 5000 })

    // Change utility type to "Parse JSON"
    await page.locator('#utility-type').click()
    await page.getByRole('option', { name: /Parse JSON/i }).click()

    // Verify input_source field is visible
    await expect(page.getByLabel(/Input Source/i)).toBeVisible()
  })

  test('utility step shows as testable (Test button enabled)', async ({ page }) => {
    // Add utility step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Utility/i }).click()
    await page.getByText('Utility').first().click()

    // Wait for config panel
    await expect(page.getByText('Utility Type')).toBeVisible({ timeout: 5000 })

    // Verify there's a Test button in the config panel
    await expect(page.getByRole('button', { name: /Test/i })).toBeVisible()
  })

  test('inline test with math expression — verify result', async ({ page }) => {
    // Add utility step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Utility/i }).click()
    await page.getByText('Utility').first().click()

    // Wait for config panel
    await expect(page.getByText('Utility Type')).toBeVisible({ timeout: 5000 })

    // Change to math
    await page.locator('#utility-type').click()
    await page.getByRole('option', { name: 'Math' }).click()

    // Fill in a math expression
    await page.getByLabel(/Math Expression/i).fill('(2 + 3) * 4')

    // Wait for auto-save
    await page.waitForTimeout(2000)

    // Click the Test button
    await page.getByRole('button', { name: /Test/i }).click()

    // Wait for test to start and navigate to Tests tab
    await expect(page.getByText('Test started')).toBeVisible({ timeout: 10000 })
    await page.getByRole('tab', { name: /Tests/i }).click()

    // Wait for test result to appear (success icon) and expand it
    await expect(page.getByText('Utility').first()).toBeVisible({ timeout: 10000 })
    await page.locator('button', { hasText: 'Utility' }).first().click()

    // Verify the result output contains 20
    await expect(page.locator('pre', { hasText: '20' })).toBeVisible({ timeout: 5000 })
  })

  test('runs workflow with utility step — verify completed', async ({ page }) => {
    // Add utility step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Utility/i }).click()

    // Wait for auto-save, publish, run
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /Run/i }).first().click()
    await page.waitForTimeout(1000)

    // Switch to Runs tab
    await page.getByRole('tab', { name: /Runs/i }).click()

    // Verify run shows with 1 step
    await expect(page.getByText(/[0-1]\/1 steps/)).toBeVisible({ timeout: 10000 })
  })
})
