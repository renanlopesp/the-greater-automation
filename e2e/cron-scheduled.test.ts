import { test, expect } from '@playwright/test'

test.describe('Scheduled Workflow Execution Endpoint', () => {
  const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret'
  const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

  test('returns 401 without authorization header', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/workflows/00000000-0000-0000-0000-000000000000/execute-scheduled`
    )
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 401 with wrong secret', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/workflows/00000000-0000-0000-0000-000000000000/execute-scheduled`,
      { headers: { Authorization: 'Bearer wrong-secret' } }
    )
    expect(response.status()).toBe(401)
  })

  test('returns 404 for non-existent workflow', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/workflows/00000000-0000-0000-0000-000000000000/execute-scheduled`,
      { headers: { Authorization: `Bearer ${CRON_SECRET}` } }
    )
    expect(response.status()).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Workflow not found')
  })

  test('creates scheduled workflow, publishes, and executes via endpoint', async ({
    page,
    request,
  }) => {
    // 1. Create a workflow with scheduled trigger
    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New workflow' }).click()
    await page.waitForURL(/\/workflows\/.*\/edit/, { timeout: 15000 })
    await expect(page.getByText('Add a step to start a run')).toBeVisible({ timeout: 10000 })

    // Extract workflow ID from URL
    const url = page.url()
    const workflowId = url.match(/\/workflows\/([^/]+)\/edit/)?.[1]
    expect(workflowId).toBeTruthy()

    // 2. Change trigger to Scheduled
    await page.getByRole('button', { name: /Manual/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /Scheduled/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // 3. Add a step (Utility for simplicity)
    await page.getByRole('button', { name: 'Add step' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('option', { name: /^Utility / }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // 4. Wait for auto-save
    await page.waitForTimeout(3000)

    // 5. Publish
    await page.getByRole('button', { name: /Publish/i }).click()
    await expect(page.getByText(/published/i)).toBeVisible({ timeout: 5000 })

    // 6. Call execute-scheduled endpoint directly
    const response = await request.post(
      `${BASE_URL}/api/workflows/${workflowId}/execute-scheduled`,
      { headers: { Authorization: `Bearer ${CRON_SECRET}` } }
    )
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.runId).toBeTruthy()
  })
})
