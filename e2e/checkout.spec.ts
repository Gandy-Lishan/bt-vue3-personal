import { expect, test } from '@playwright/test'

test('checkout card element renders placeholder and accepts input', async ({ page }) => {
  // Mock the plan API so the checkout form renders without the backend
  await page.route('/api/recurly/plan/everything-monthly', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'code-everything-monthly',
        name: 'Everything Monthly',
        description: 'Full access',
        interval_unit: 'months',
        interval_length: 1,
        trial_unit: 'days',
        trial_length: 14,
        amount: 49,
      }),
    })
  })

  await page.goto('/checkout?plan=everything-monthly')

  // Wait for the card container and the Recurly iframe inside it
  const cardContainer = page.locator('[data-testid="card-container"]')
  await expect(cardContainer).toBeVisible()

  // Recurly v4 CardElement attaches a cross-origin iframe
  const cardFrame = page.frameLocator('iframe[src*="recurly.com/v4/field"]').first()
  await expect(cardFrame.locator('input[placeholder="Card number"]')).toBeVisible()

  // Take a reference screenshot of the empty card field
  await expect(cardContainer).toHaveScreenshot('checkout-card-empty.png')
})
