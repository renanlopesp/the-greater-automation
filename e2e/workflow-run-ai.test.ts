import { test, expect } from '@playwright/test'

test.describe('AI Workflow Execution', () => {
  test('creates workflow with AI step, publishes, and starts run', async ({ page }) => {
    // 1. Go to workspace
    await page.goto('/workspace')

    // 2. Click "New workflow"
    await page.getByRole('button', { name: 'New workflow' }).click()

    // 3. Wait for editor to load
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    // 4. Click "Add step" -> select "AI" from dropdown/menu
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify AI step is visible
    await expect(page.getByText('AI').first()).toBeVisible()

    // 5. Wait for auto-save
    await page.waitForTimeout(3000)

    // 6. Click "Publish" button
    await page.getByRole('button', { name: /Publish/i }).click()

    // 7. Verify toast "Workflow published"
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    // 8. Click "Run" button
    await page.getByRole('button', { name: /Run/i }).first().click()

    // Wait for the action to be triggered
    await page.waitForTimeout(1000)

    // 9. Click "Runs" tab
    await page.getByRole('tab', { name: /Runs/i }).click()

    // 10. Verify a run was created (appears in the list)
    await expect(page.getByText(/\d+\/\d+ steps/)).toBeVisible({ timeout: 10000 })

    // 11. Verify run shows expected format (X/1 steps where X is 0 or 1)
    await expect(page.getByText(/[0-1]\/1 steps/)).toBeVisible()

    // 12. Verify the run has a status (running, completed, failed, or pending)
    await expect(page.locator('text=/running|completed|failed|pending/i')).toBeVisible()
  })

  test('shows error toast when running unpublished workflow', async ({ page }) => {
    // 1. Go to workspace
    await page.goto('/workspace')

    // 2. Create new workflow
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    // 3. Add AI step
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('AI').first()).toBeVisible()

    // 4. Wait for save
    await page.waitForTimeout(3000)

    // 5. Click "Run" WITHOUT publishing
    await page.getByRole('button', { name: /Run/i }).first().click()

    // 6. Verify toast "Cannot run workflow" with description about publishing first
    await expect(page.getByText('Cannot run workflow')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Publish the workflow before running it/i)).toBeVisible()
  })

  test('multi-step workflow creates run with correct step count', async ({ page }) => {
    // 1. Create workflow
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    // 2. Add AI step (first)
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByText('AI').first()).toBeVisible()

    // 3. Add another step (e.g., Utility)
    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^Utility /i }).click()
    await expect(page.getByText('Utility').first()).toBeVisible()

    // 4. Wait for save, publish, run
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /Run/i }).first().click()
    await page.waitForTimeout(1000)

    // 5. Go to Runs tab
    await page.getByRole('tab', { name: /Runs/i }).click()

    // 6. Verify run shows 2 steps total (X/2 steps format)
    await expect(page.getByText(/[0-2]\/2 steps/)).toBeVisible({ timeout: 10000 })
  })

  test('cannot publish workflow without at least one step', async ({ page }) => {
    // 1. Create empty workflow (no steps)
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    // 2. Try to publish without adding any steps
    await page.getByRole('button', { name: /Publish/i }).click()

    // 3. Verify toast error about needing at least one step
    await expect(page.getByText(/Publish failed/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Cannot publish workflow without at least one step/i)).toBeVisible()
  })

  test('run appears in runs list after starting', async ({ page }) => {
    // Create workflow with AI step
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByText('AI').first()).toBeVisible()

    // Publish and run
    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /Run/i }).first().click()
    await page.waitForTimeout(1000)

    // Go to Runs tab
    await page.getByRole('tab', { name: /Runs/i }).click()

    // Verify run list heading shows "Run history"
    await expect(page.getByRole('heading', { name: 'Run history' })).toBeVisible()

    // Verify shows "1 run"
    await expect(page.getByText('1 run')).toBeVisible()

    // Verify run entry is clickable
    const runButton = page.locator('button:has-text("0/1 steps"), button:has-text("1/1 steps")')
    await expect(runButton.first()).toBeVisible()
  })

  test('published workflow stays published after page reload', async ({ page }) => {
    // Create and publish workflow
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    const workflowUrl = page.url()

    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByText('AI').first()).toBeVisible()

    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    // Verify button shows "Published" state
    const publishedButton = page.getByRole('button', { name: /Published/i })
    await expect(publishedButton).toBeVisible()

    // Reload page
    await page.reload()
    await page.waitForURL(workflowUrl)
    await expect(page.getByText('AI').first()).toBeVisible({ timeout: 10000 })

    // Verify still published
    await expect(page.getByRole('button', { name: /Published/i })).toBeVisible()
  })

  test('can unpublish a published workflow', async ({ page }) => {
    // Create, add step, publish
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: 'Add step' }).click()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByText('AI').first()).toBeVisible()

    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    // Unpublish by clicking the Published button
    await page.getByRole('button', { name: /Published/i }).click()

    // Verify toast "Workflow unpublished"
    await expect(page.getByText('Workflow unpublished')).toBeVisible({ timeout: 5000 })

    // Verify button now shows "Publish" (not published state)
    const publishButton = page.getByRole('button', { name: /^Publish$/i })
    await expect(publishButton).toBeVisible()
  })

  test('runs tab shows empty state for new workflow', async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    // Go directly to Runs tab
    await page.getByRole('tab', { name: /Runs/i }).click()

    // Verify empty state
    await expect(page.getByText('No runs yet')).toBeVisible()
    await expect(page.getByText('Start your first workflow run')).toBeVisible()
    await expect(page.getByRole('button', { name: /Run now/i })).toBeVisible()
  })

  test('run now button exists in empty state and can be clicked', async ({ page }) => {
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 20000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    // Add step and publish
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^AI / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('AI').first()).toBeVisible()

    await page.waitForTimeout(3000)
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText('Workflow published')).toBeVisible({ timeout: 5000 })

    // Go to Runs tab
    await page.getByRole('tab', { name: /Runs/i }).click()
    await expect(page.getByText('No runs yet')).toBeVisible()

    // Verify "Run now" button is visible and enabled
    const runNowButton = page.getByRole('button', { name: /Run now/i })
    await expect(runNowButton).toBeVisible()
    await expect(runNowButton).toBeEnabled()

    // Click it and verify it becomes disabled (loading state)
    await runNowButton.click()
    await expect(runNowButton).toBeDisabled({ timeout: 2000 })
  })
})
