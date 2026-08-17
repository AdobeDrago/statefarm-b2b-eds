import { test, expect } from '@playwright/test';

test.describe('B2B Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/b2b-content');
  });

  test('TC01 - Verify home page loads', async ({ page }) => {
    await expect(page).toHaveURL(/b2b-content/);
  });

  test('TC02 - Verify page heading is displayed', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Business to business portal' }),
    ).toBeVisible();
  });

  test('TC03 - Verify Log In button is displayed', async ({ page }) => {
    await expect(
      page.getByTitle('Log In', { name: 'Log In' }),
    ).toBeVisible();
  });

  test('TC04 - Verify main navigation is displayed', async ({ page }) => {
    await expect(page.getByTitle('Select Service')).toBeVisible();
    await expect(page.getByTitle('Claims')).toBeVisible();
    await expect(page.getByTitle('Payments')).toBeVisible();
    await expect(page.getByTitle('Lenders')).toBeVisible();
    await expect(page.getByTitle('Suppliers')).toBeVisible();
  });
});
