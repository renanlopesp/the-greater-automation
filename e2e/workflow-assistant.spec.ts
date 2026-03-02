import { test, expect } from '@playwright/test'

test.describe('Workflow AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workspace and create a new blank workflow
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/[a-f0-9-]+\/edit$/, { timeout: 15000 })
  })

  test('shows use-case cards in empty state', async ({ page }) => {
    // Click the floating assistant button to open the sheet (force to bypass Next.js dev overlay)
    await page.getByRole('button', { name: 'Open assistant' }).click({ force: true })

    // Wait for the sheet to open
    await expect(page.getByText('Snew.app Assistant')).toBeVisible({ timeout: 10000 })

    // Verify the empty state header
    await expect(page.getByText('What can I help you build?')).toBeVisible()

    // Verify all 4 use-case cards are displayed with titles and descriptions
    await expect(page.getByText('Meeting briefings')).toBeVisible()
    await expect(
      page.getByText('Prepare for meetings with AI-generated context and summaries')
    ).toBeVisible()

    await expect(page.getByText('Competitor analysis')).toBeVisible()
    await expect(
      page.getByText('Track competitor activity and get AI-powered insights')
    ).toBeVisible()

    await expect(page.getByText('Email assistant')).toBeVisible()
    await expect(
      page.getByText('Automatically draft, summarize, and categorize emails')
    ).toBeVisible()

    await expect(page.getByText('YouTube summarizer')).toBeVisible()
    await expect(page.getByText('Get AI summaries of YouTube videos and channels')).toBeVisible()
  })

  test('can type message in assistant textarea', async ({ page }) => {
    // Open assistant (force click to bypass Next.js dev overlay portal)
    await page.getByRole('button', { name: 'Open assistant' }).click({ force: true })
    await expect(page.getByText('Snew.app Assistant')).toBeVisible({ timeout: 10000 })

    // Find and type in the textarea
    const textarea = page.getByPlaceholder('Describe a workflow or ask a question')
    await expect(textarea).toBeVisible()
    await textarea.fill('Build a workflow to send daily email summaries')

    // Verify the textarea has the text
    await expect(textarea).toHaveValue('Build a workflow to send daily email summaries')
  })

  test('clicking use-case card sends message', async ({ page }) => {
    // Skip this test if OPENAI_API_KEY is not configured to avoid CI failures
    if (!process.env.OPENAI_API_KEY) {
      test.skip()
    }

    // Open assistant (force click to bypass Next.js dev overlay portal)
    await page.getByRole('button', { name: 'Open assistant' }).click({ force: true })
    await expect(page.getByText('Snew.app Assistant')).toBeVisible({ timeout: 10000 })

    // Click on "Meeting briefings" use-case card
    await page.getByText('Meeting briefings').click()

    // Wait for the message to appear in the chat
    await expect(page.getByText(/daily meeting briefings/i)).toBeVisible({ timeout: 10000 })

    // Verify the empty state is no longer visible
    await expect(page.getByText('What can I help you build?')).not.toBeVisible()
  })

  test('assistant panel can be closed', async ({ page }) => {
    // Open assistant (force click to bypass Next.js dev overlay portal)
    await page.getByRole('button', { name: 'Open assistant' }).click({ force: true })
    await expect(page.getByText('Snew.app Assistant')).toBeVisible({ timeout: 10000 })

    // Close the assistant using the close button (PanelLeftClose icon button)
    await page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-panel-left-close') })
      .click()

    // Verify the assistant panel is closed
    await expect(page.getByText('Snew.app Assistant')).not.toBeVisible()
  })

  test('assistant floating button is visible in editor', async ({ page }) => {
    // Verify the floating assistant button is visible on the page
    const assistantButton = page.getByRole('button', { name: 'Open assistant' })
    await expect(assistantButton).toBeVisible()

    // Verify the button has the gradient styling (contains Sparkles icon)
    const sparklesIcon = assistantButton.locator('svg.lucide-sparkles')
    await expect(sparklesIcon).toBeVisible()
  })
})
