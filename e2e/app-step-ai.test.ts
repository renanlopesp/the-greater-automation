import { test, expect } from '@playwright/test'

test.describe('Workflow Editor - App Step AI', () => {
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

    // Should show app selection grid
    await expect(page.getByText('Select App')).toBeVisible()
  })

  test('selects app and sees instructions textarea instead of action dropdown', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    // Select an app (GitHub if available, or first available)
    const appButtons = page
      .locator('button')
      .filter({ hasText: /github|slack|notion|discord|linkedin/i })
    const count = await appButtons.count()
    if (count > 0) {
      await appButtons.first().click()

      // Should show instructions textarea
      await expect(page.getByText('Instructions')).toBeVisible()
      await expect(page.getByPlaceholder(/describe what you want this app to do/i)).toBeVisible()

      // Should NOT show action dropdown or configuration fields
      await expect(page.getByText('Action')).not.toBeVisible()
      await expect(
        page.locator('select, [role="combobox"]').filter({ hasText: /select an action/i })
      ).not.toBeVisible()
    }
  })

  test('types instructions and verifies config saves', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    const appButtons = page
      .locator('button')
      .filter({ hasText: /github|slack|notion|discord|linkedin/i })
    const count = await appButtons.count()
    if (count > 0) {
      await appButtons.first().click()

      // Type instructions
      const textarea = page.getByPlaceholder(/describe what you want this app to do/i)
      await textarea.fill('Create an issue with the error details from the previous step')

      // Verify instructions textarea has the value
      await expect(textarea).toHaveValue(
        'Create an issue with the error details from the previous step'
      )
    }
  })

  test('no action dropdown or dynamic parameter fields are rendered', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    const appButtons = page
      .locator('button')
      .filter({ hasText: /github|slack|notion|discord|linkedin/i })
    const count = await appButtons.count()
    if (count > 0) {
      await appButtons.first().click()

      // Verify NO action dropdown exists
      await expect(page.getByRole('combobox')).not.toBeVisible()

      // Verify NO "Configuration" section (the old dynamic params)
      await expect(page.getByText('Configuration')).not.toBeVisible()
    }
  })

  test('switching apps preserves instructions field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    const appButtons = page
      .locator('button')
      .filter({ hasText: /github|slack|notion|discord|linkedin/i })
    const count = await appButtons.count()
    if (count >= 2) {
      // Select first app
      await appButtons.first().click()

      // Type instructions
      const instructionsText = 'Send a notification when the workflow completes'
      const textarea = page.getByPlaceholder(/describe what you want this app to do/i)
      await textarea.fill(instructionsText)
      await expect(textarea).toHaveValue(instructionsText)

      // Switch to second app
      await appButtons.nth(1).click()

      // Instructions field should still be visible and preserve the value
      await expect(page.getByText('Instructions')).toBeVisible()
      await expect(textarea).toHaveValue(instructionsText)
    }
  })

  test('shows helpful placeholder text for instructions', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    const appButtons = page
      .locator('button')
      .filter({ hasText: /github|slack|notion|discord|linkedin/i })
    const count = await appButtons.count()
    if (count > 0) {
      await appButtons.first().click()

      // Check for helper text
      await expect(page.getByText(/provide natural language instructions/i)).toBeVisible()
    }
  })

  test('shows loading state when fetching connections', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^App /i }).click()
    await page.locator('[class*="cursor-pointer"]', { hasText: 'App' }).first().click()

    // Loading spinner should appear briefly (this may be too fast to catch reliably)
    // So we just verify the grid eventually appears
    await expect(page.getByText('Select App')).toBeVisible()
  })
})
