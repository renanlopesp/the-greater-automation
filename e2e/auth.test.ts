import { test, expect } from '@playwright/test'

test.describe('Auth Pages', () => {
  test('/ redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/login renders login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /log in to relay/i })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /log in$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()
  })

  test('/login has link to /signup', async ({ page }) => {
    await page.goto('/login')
    const signUpLink = page.getByRole('link', { name: /sign up/i })
    await expect(signUpLink).toBeVisible()
    await signUpLink.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('/signup renders signup form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /create your relay account/i })).toBeVisible()
    await expect(page.getByLabel('Full name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('/signup has link to /login', async ({ page }) => {
    await page.goto('/signup')
    const loginLink = page.getByRole('link', { name: /log in/i })
    await expect(loginLink).toBeVisible()
    await loginLink.click()
    await expect(page).toHaveURL(/\/login/)
  })
})
