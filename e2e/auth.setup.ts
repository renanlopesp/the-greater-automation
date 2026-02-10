import { test as setup, expect } from '@playwright/test'

const authFile = '.auth/user.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('e2e-relay-test@gmail.com')
  await page.getByLabel('Password').fill('E2eTestPass123!')
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL('/dashboard', { timeout: 15000 })
  await expect(page).toHaveURL(/\/dashboard/)
  await page.context().storageState({ path: authFile })
})
