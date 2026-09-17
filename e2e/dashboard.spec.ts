import { expect, test } from '@playwright/test'

test('renders the dashboard shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Backtest operations' })).toBeVisible()
  await expect(page.getByText('Momentum Rotation')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Backtests' })).toBeVisible()
})

test('toggles and persists the color theme', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.setItem('backtestedge-theme', 'light')
  })
  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
