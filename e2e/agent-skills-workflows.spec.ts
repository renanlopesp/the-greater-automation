import { test, expect } from '@playwright/test'

test.describe('Agent Sidebar - Skills and Workflows Tabs', () => {
  test('sidebar has Workflows and Skills tabs', async ({ page }) => {
    // Create agent via UI
    await page.goto('/agents/new')
    await page.getByRole('textbox', { name: 'Name' }).fill('Tab Test Agent')
    await page.getByRole('textbox', { name: 'Description' }).fill('E2E test')
    await page.getByRole('button', { name: 'Create' }).click()
    await page.waitForURL(/\/agents\/[a-f0-9-]+$/)

    // Open sidebar
    await page.locator('button svg.lucide-sliders-horizontal').locator('..').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Agent Details')).toBeVisible()

    // Verify both tabs exist
    await expect(page.getByRole('tab', { name: 'Workflows' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Skills' })).toBeVisible()
  })

  test('tab switching and skill creation', async ({ page }) => {
    // Create agent via UI
    await page.goto('/agents/new')
    await page.getByRole('textbox', { name: 'Name' }).fill('Skill Test Agent')
    await page.getByRole('textbox', { name: 'Description' }).fill('E2E test')
    await page.getByRole('button', { name: 'Create' }).click()
    await page.waitForURL(/\/agents\/[a-f0-9-]+$/)

    // Open sidebar
    await page.locator('button svg.lucide-sliders-horizontal').locator('..').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Workflows tab is active by default
    const workflowsTab = page.getByRole('tab', { name: 'Workflows' })
    const skillsTab = page.getByRole('tab', { name: 'Skills' })
    await expect(workflowsTab).toHaveAttribute('data-state', 'active')

    // Switch to Skills tab
    await skillsTab.click()
    await expect(skillsTab).toHaveAttribute('data-state', 'active')

    // Click Add skill and fill form
    await page.getByRole('button', { name: 'Add skill' }).click()
    await expect(page.getByPlaceholder('Skill name')).toBeVisible()

    await page.getByPlaceholder('Skill name').fill('Test Skill')
    await page.getByPlaceholder('Description (optional)').fill('A test description')
    await page.getByPlaceholder(/Skill content/).fill('Test knowledge content for the agent.')

    // Create
    await page.getByRole('button', { name: 'Create' }).click()

    // Skill should appear in the list
    await expect(page.getByText('Test Skill')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('A test description')).toBeVisible()

    // Switch back to Workflows tab
    await workflowsTab.click()
    await expect(workflowsTab).toHaveAttribute('data-state', 'active')
  })
})
