import { test, expect } from '@playwright/test'

test.describe('Workflow Editor - Multi-step Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('scheduled trigger + AI + HTTP steps', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Scheduled/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Scheduled')).toBeVisible()

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /HTTP Request/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByText('AI').first()).toBeVisible()
    await expect(page.getByText('HTTP Request').first()).toBeVisible()
  })

  test('webhook trigger + all 8 step types', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('option', { name: /Webhook/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Webhook')).toBeVisible()

    const stepTypes = [
      /^AI /,
      /HTTP Request/i,
      /^App /,
      /Flow Control/i,
      /Web Scraping/i,
      /Human in the Loop/i,
      /^Utility /i,
      /^Sequence /i,
    ]

    for (const stepName of stepTypes) {
      await page.getByRole('button', { name: 'Add step' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('option', { name: stepName }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
    }

    await expect(page.getByText('AI').first()).toBeVisible()
    await expect(page.getByText('HTTP Request').first()).toBeVisible()
    await expect(page.getByText('Flow Control').first()).toBeVisible()
    await expect(page.getByText('Web Scraping').first()).toBeVisible()
    await expect(page.getByText('Human in the Loop').first()).toBeVisible()
    await expect(page.getByText('Utility').first()).toBeVisible()
    await expect(page.getByText('Sequence').first()).toBeVisible()
  })

  test('form trigger + flow control + utility', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('option', { name: /^Form/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Form').first()).toBeVisible()

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Flow Control/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^Utility /i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByText('Flow Control').first()).toBeVisible()
    await expect(page.getByText('Utility').first()).toBeVisible()
  })

  test('add and configure multiple steps sequentially', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.locator('[class*="cursor-pointer"]', { hasText: 'AI' }).first().click()
    await expect(page.getByText('Use AI to transform, classify, or generate content')).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /HTTP Request/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.locator('[class*="cursor-pointer"]', { hasText: 'HTTP Request' }).first().click()
    await expect(page.getByText('Make custom HTTP requests to any API')).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()

    await expect(page.getByText('AI').first()).toBeVisible()
    await expect(page.getByText('HTTP Request').first()).toBeVisible()
  })

  test('step numbering updates after deletion', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /HTTP Request/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^Utility /i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByText('AI').first()).toBeVisible()
    await expect(page.getByText('HTTP Request').first()).toBeVisible()
    await expect(page.getByText('Utility').first()).toBeVisible()

    // Select the middle step (HTTP), delete it
    await page.locator('[class*="cursor-pointer"]', { hasText: 'HTTP Request' }).first().click()
    await page.keyboard.press('Delete')

    await expect(page.getByText('AI').first()).toBeVisible()
    await expect(page.getByText('Utility').first()).toBeVisible()
    await expect(
      page.locator('[class*="cursor-pointer"]', { hasText: 'HTTP Request' })
    ).not.toBeVisible()
  })

  test('navigates between Editor and Runs tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Editor/i })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(page.getByText('Add a step to start a run')).toBeVisible()

    await page.getByRole('tab', { name: /Runs/i }).click()
    await expect(page.getByRole('tab', { name: /Runs/i })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('No runs yet')).toBeVisible()

    await page.getByRole('tab', { name: /Editor/i }).click()
    await expect(page.getByText('Add a step to start a run')).toBeVisible()
  })

  test('searches steps in step selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByPlaceholder('Search steps...').fill('http')
    await expect(page.getByRole('option', { name: /HTTP Request/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /^AI / })).not.toBeVisible()
  })

  test('adds step from connected apps section', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('option', { name: /^Email$/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('App').first()).toBeVisible()
  })
})
