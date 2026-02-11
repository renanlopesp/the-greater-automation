import { test, expect } from '@playwright/test'

test.describe('Web Scraping Step', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('adds web scraping step to workflow', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Web Scraping/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByText('Web Scraping').first()).toBeVisible()
  })

  test('configures scrape mode with URL and output format', async ({ page }) => {
    // Add web scraping step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Web Scraping/i }).click()

    // Click the step to open config panel
    await page.getByText('Web Scraping').first().click()

    // Verify the config panel is visible with "Action" label
    await expect(page.getByText('Action')).toBeVisible({ timeout: 5000 })

    // Verify "Scrape Page" is the default action
    await expect(page.getByText('Scrape Page')).toBeVisible()

    // Fill in URL
    await page.getByLabel('URL').fill('https://example.com')

    // Verify output format default (Markdown)
    await expect(page.getByText('Markdown')).toBeVisible()

    // Verify "Only main content" toggle is visible
    await expect(page.getByText('Only main content')).toBeVisible()
  })

  test('configures map mode with URL and limit', async ({ page }) => {
    // Add web scraping step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Web Scraping/i }).click()
    await page.getByText('Web Scraping').first().click()

    // Wait for config panel
    await expect(page.getByText('Action')).toBeVisible({ timeout: 5000 })

    // Change action to "Map Site"
    await page.locator('#action').click()
    await page.getByRole('option', { name: 'Map Site' }).click()

    // Verify map-specific fields appear
    await expect(page.getByLabel('URL')).toBeVisible()
    await expect(page.getByLabel('Limit')).toBeVisible()

    // Search field should be visible for map mode
    await expect(page.getByLabel(/Search/)).toBeVisible()

    // Output format should NOT be visible in map mode
    await expect(page.getByText('Output Format')).not.toBeVisible()
  })

  test('configures search mode with query', async ({ page }) => {
    // Add web scraping step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Web Scraping/i }).click()
    await page.getByText('Web Scraping').first().click()

    // Wait for config panel
    await expect(page.getByText('Action')).toBeVisible({ timeout: 5000 })

    // Change action to "Web Search"
    await page.locator('#action').click()
    await page.getByRole('option', { name: 'Web Search' }).click()

    // Verify search-specific fields appear
    await expect(page.getByLabel('Search Query')).toBeVisible()
    await expect(page.getByLabel('Limit')).toBeVisible()
    await expect(page.getByText('Output Format')).toBeVisible()

    // URL field should NOT be visible in search mode
    await expect(page.getByLabel('URL')).not.toBeVisible()
  })

  test('web scraping step shows as testable in config panel', async ({ page }) => {
    // Add web scraping step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Web Scraping/i }).click()
    await page.getByText('Web Scraping').first().click()

    // Wait for config panel
    await expect(page.getByText('Action')).toBeVisible({ timeout: 5000 })

    // Verify there's a Test button in the config panel footer
    await expect(page.getByRole('button', { name: /Test/i })).toBeVisible()
  })

  test('runs workflow with web scraping step and shows completed', async ({ page }) => {
    // Add web scraping step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Web Scraping/i }).click()

    // Verify step exists
    await expect(page.getByText('Web Scraping').first()).toBeVisible()

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
