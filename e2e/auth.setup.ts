/**
 * Auth setup for E2E tests.
 *
 * To enable authenticated E2E tests:
 * 1. Create a test user in Supabase dashboard
 * 2. Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD environment variables
 * 3. Uncomment the setup below and add `storageState` to playwright.config.ts projects
 *
 * Example playwright.config.ts change:
 *   projects: [
 *     { name: 'setup', testMatch: /auth\.setup\.ts/ },
 *     { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' }, dependencies: ['setup'] },
 *   ]
 */

// import { test as setup, expect } from '@playwright/test'
//
// const authFile = '.auth/user.json'
//
// setup('authenticate', async ({ page }) => {
//   await page.goto('/login')
//   await page.getByLabel('Email').fill(process.env.E2E_TEST_EMAIL!)
//   await page.getByLabel('Password').fill(process.env.E2E_TEST_PASSWORD!)
//   await page.getByRole('button', { name: 'Sign in' }).click()
//   await page.waitForURL('/dashboard')
//   await page.context().storageState({ path: authFile })
// })

export {}
