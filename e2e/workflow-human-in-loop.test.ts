import { test, expect } from '@playwright/test'

test.describe('Human in the Loop Step', () => {
  test.describe.configure({ timeout: 60000 })

  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 30000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })
  })

  test('adds human_in_loop step to workflow via step selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify the step was added
    await expect(page.getByText('Human in the Loop').first()).toBeVisible()
  })

  test('configures approval mode with prompt text', async ({ page }) => {
    // Add human_in_loop step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()

    // Click the step to open config panel
    await page.getByText('Human in the Loop').first().click()

    // Verify config panel is visible
    await expect(page.getByText('Action Type')).toBeVisible({ timeout: 5000 })

    // Verify "Approval" is the default action type via combobox
    const actionTypeCombo = page.getByRole('combobox', { name: 'Action Type' })
    await expect(actionTypeCombo).toHaveText('Approval')

    // Fill in the prompt
    const promptInput = page.getByLabel('Prompt')
    await promptInput.fill('Please approve this deployment to production')
    await expect(promptInput).toHaveValue('Please approve this deployment to production')
  })

  test('configures input mode with prompt', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()
    await page.getByText('Human in the Loop').first().click()

    // Wait for config panel
    await expect(page.getByText('Action Type')).toBeVisible({ timeout: 5000 })

    // Change action type to "Input"
    await page.locator('#action-type').click()
    await page.getByRole('option', { name: 'Input' }).click()

    // Fill in the prompt
    const promptInput = page.getByLabel('Prompt')
    await promptInput.fill('Please provide the API key')
    await expect(promptInput).toHaveValue('Please provide the API key')
  })

  test('step shows as testable in config panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()
    await page.getByText('Human in the Loop').first().click()

    // Fill in required prompt so the step is "complete"
    await page.getByLabel('Prompt').fill('Approve this')

    // Look for the test button
    await expect(page.getByRole('button', { name: /Test/i })).toBeVisible({ timeout: 5000 })
  })

  test('inline test executes and shows auto-approved result', async ({ page }) => {
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()
    await page.getByText('Human in the Loop').first().click()

    // Fill in required prompt
    await page.getByLabel('Prompt').fill('Approve this deployment')

    // Click test button
    await page.getByRole('button', { name: /Test/i }).click()

    // Switch to Tests tab to see results
    await page.getByRole('tab', { name: /Tests/i }).click()

    // Wait for the test result to appear — shows step name and type badge
    await expect(page.getByText('human_in_loop').first()).toBeVisible({ timeout: 15000 })
  })

  test('run workflow with human step pauses at waiting status', async ({ page }) => {
    // Add human_in_loop step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()
    await page.getByText('Human in the Loop').first().click()

    // Configure the step
    await page.getByLabel('Prompt').fill('Approve deployment to production')

    // Wait for auto-save then publish
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    // Run the workflow
    await page.getByRole('tab', { name: /Runs/i }).click()
    await page.getByRole('button', { name: /Run now/i }).click()

    // Wait for the run to appear and show "waiting" status
    await expect(page.getByText('waiting').first()).toBeVisible({ timeout: 15000 })
  })

  test('approve via inline form resumes and completes run', async ({ page }) => {
    // Add human_in_loop step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()
    await page.getByText('Human in the Loop').first().click()

    // Configure
    await page.getByLabel('Prompt').fill('Approve deployment to production')

    // Wait for auto-save then publish
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    // Run workflow
    await page.getByRole('tab', { name: /Runs/i }).click()
    await page.getByRole('button', { name: /Run now/i }).click()

    // Wait for waiting status and click into run detail
    await expect(page.getByText('waiting').first()).toBeVisible({ timeout: 15000 })
    await page.getByText('waiting').first().click()

    // Should see the approval card with the prompt
    await expect(page.getByText('Approve deployment to production')).toBeVisible({ timeout: 10000 })

    // Click the Approve button
    await page.getByRole('button', { name: 'Approve' }).click()

    // Run should resume and complete
    await expect(page.getByText('completed')).toBeVisible({ timeout: 15000 })
  })

  test('reject via inline form fails the run', async ({ page }) => {
    // Add human_in_loop step
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /Human in the Loop/i }).click()
    await page.getByText('Human in the Loop').first().click()

    // Configure
    await page.getByLabel('Prompt').fill('Approve deployment to production')

    // Wait for auto-save then publish
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    // Run workflow
    await page.getByRole('tab', { name: /Runs/i }).click()
    await page.getByRole('button', { name: /Run now/i }).click()

    // Wait for waiting status and click into run detail
    await expect(page.getByText('waiting').first()).toBeVisible({ timeout: 15000 })
    await page.getByText('waiting').first().click()

    // Should see the approval card
    await expect(page.getByText('Approve deployment to production')).toBeVisible({ timeout: 10000 })

    // Type a rejection reason
    await page.getByPlaceholder('Add a comment').fill('Not ready for production')

    // Click Reject
    await page.getByRole('button', { name: 'Reject' }).click()

    // Run should fail
    await expect(page.getByText('failed', { exact: true })).toBeVisible({ timeout: 15000 })
  })
})
