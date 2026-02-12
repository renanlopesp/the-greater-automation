import { test, expect } from '@playwright/test'

test.describe('Workflow Editor - Core', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('creates a new workflow from workspace', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Editor/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Runs/i })).toBeVisible()
    await expect(page.getByText('Add a step to start a run')).toBeVisible()
    await expect(page.getByText('Start run manually')).toBeVisible()
    await expect(page.getByText('Add step')).toBeVisible()
  })

  test('renames workflow via header input', async ({ page }) => {
    const nameInput = page.getByRole('textbox')
    await expect(nameInput).toHaveValue('Untitled Workflow')
    await nameInput.click()
    await nameInput.clear()
    await nameInput.fill('My Test Workflow')
    await expect(nameInput).toHaveValue('My Test Workflow')
  })

  test('trigger panel shows default manual trigger', async ({ page }) => {
    await expect(page.getByText('Start run manually')).toBeVisible()
    await expect(page.getByText('Add a step to start a run')).toBeVisible()
  })

  test('changes trigger to Scheduled', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('button', { name: /Change type/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Scheduled/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Scheduled').first()).toBeVisible()
  })

  test('changes trigger to Webhook', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('button', { name: /Change type/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Webhook/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Webhook', { exact: true }).first()).toBeVisible()
  })

  test('changes trigger to Form', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('button', { name: /Change type/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^Form/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Form', { exact: true }).first()).toBeVisible()
  })

  test('changes trigger to RSS', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('button', { name: /Change type/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^RSS/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('RSS', { exact: true }).first()).toBeVisible()
  })

  test('changes trigger to Mailhook', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('button', { name: /Change type/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Mailhook/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Mailhook').first()).toBeVisible()
  })

  test('changes trigger to MCP Server', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('button', { name: /Change type/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /MCP Server/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('MCP Server').first()).toBeVisible()
  })

  test('searches triggers in selector', async ({ page }) => {
    await page.locator('button', { hasText: 'Start run manually' }).click()
    await page.getByRole('button', { name: /Change type/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByPlaceholder('Search triggers...').fill('web')
    await expect(page.getByRole('option', { name: /Webhook/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /^Manual/i })).not.toBeVisible()
  })

  test('adds an AI step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('AI').first()).toBeVisible()
  })

  test('adds HTTP Request step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /HTTP Request/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('HTTP Request').first()).toBeVisible()
  })

  test('adds Flow Control step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Flow Control/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Flow Control').first()).toBeVisible()
  })

  test('adds Web Scraping step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Web Scraping/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Web Scraping').first()).toBeVisible()
  })

  test('adds Human in the Loop step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Human in the Loop').first()).toBeVisible()
  })

  test('adds Utility step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^Utility /i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Utility').first()).toBeVisible()
  })

  test('adds Sequence step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^Sequence /i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Sequence').first()).toBeVisible()
  })

  test('adds App step', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^App /i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('App').first()).toBeVisible()
  })

  test('selects AI step and opens config panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.locator('[class*="cursor-pointer"]', { hasText: 'AI' }).first().click()
    await expect(page.getByText('Use AI to transform, classify, or generate content')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible()
  })

  test('selects HTTP step and shows config', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /HTTP Request/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.locator('[class*="cursor-pointer"]', { hasText: 'HTTP Request' }).first().click()
    await expect(page.getByText('Make custom HTTP requests to any API')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible()
  })

  test('closes config panel with Done button', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.locator('[class*="cursor-pointer"]', { hasText: 'AI' }).first().click()
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible()

    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('button', { name: 'Done' })).not.toBeVisible()
  })

  test('deselects step with Escape key', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.locator('[class*="cursor-pointer"]', { hasText: 'AI' }).first().click()
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Done' })).not.toBeVisible()
  })

  test('deletes selected step with Delete key', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const aiStep = page.locator('[class*="cursor-pointer"]', { hasText: 'AI' }).first()
    await expect(aiStep).toBeVisible()
    await aiStep.click()
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible()

    await page.keyboard.press('Delete')
    await expect(page.locator('[class*="cursor-pointer"]', { hasText: 'AI' })).not.toBeVisible()
  })

  test('builds multi-step workflow (AI + HTTP + Utility)', async ({ page }) => {
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
  })

  test('opens keyboard shortcuts dialog with ? key', async ({ page }) => {
    await page.locator('body').click()
    await page.keyboard.press('?')

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Keyboard shortcuts/i })).toBeVisible()
  })
})
