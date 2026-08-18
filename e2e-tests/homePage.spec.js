import { test, expect } from '@playwright/test';

/**
 * B2B Portal | Home — https://develop--statefarm-b2b-eds--adobedrago.aem.page/b2b-content
 * Covers content rendering, navigation, mega-menu interaction, simulated
 * login/logout, and mobile menu behavior on the homepage only.
 */

const HOME_PATH = '/b2b-content';

// service cards authored in the cards-service block, in document order
const SERVICE_CARDS = [
  { name: 'Select Service', href: '/b2b-content/select-service' },
  { name: 'Claim services', href: '/b2b-content/claim-services' },
  { name: 'Electronic payments', href: '/b2b-content/electronic-payments' },
  { name: 'Home & auto lenders', href: '/b2b-content/home-auto-lenders' },
  { name: 'Medical billing', href: '/b2b-content/medical-ebilling' },
  { name: 'Other auto insurance carriers', href: '/b2b-content/other-ins-carrier' },
  { name: 'Suppliers', href: '/b2b-content/suppliers' },
  { name: 'Rental provider portal', href: 'https://apps.b2b.statefarm.com/RentalPortalWeb' },
];

// "No login required" links authored in the columns-auth hero block
const NO_LOGIN_LINKS = [
  { name: 'Request supplement', href: 'https://apps.b2b.statefarm.com/req-supp/' },
  { name: 'Create assignment', href: 'https://apps.b2b.statefarm.com/ss-assign' },
  { name: 'Fire service provider tool', href: 'https://fire-vendor.b2b.statefarm.com/validate-claim' },
];

// top-level nav triggers authored in nav.plain.html
const NAV_ITEMS = ['Select Service', 'Claims', 'Payments', 'Lenders', 'Suppliers', 'Insurance Carriers', 'Medical Billing'];

test.describe('B2B Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HOME_PATH);
  });

  test('TC01 - Verify home page loads with the correct title', async ({ page }) => {
    await expect(page).toHaveURL(/b2b-content/);
    await expect(page).toHaveTitle('B2B Portal | Home');
  });

  test('TC02 - Verify hero heading and intro copy are displayed', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Business to business portal' }),
    ).toBeVisible();
    await expect(
      page.getByText('Find claims, payments, policies, supplier info and more.'),
    ).toBeVisible();
  });

  test('TC03 - Verify Log In button is displayed', async ({ page }) => {
    await expect(page.locator('header').getByTitle('Log In')).toBeVisible();
  });

  test('TC04 - Verify "No login required" links are displayed', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'No login required:' })).toBeVisible();
    await Promise.all(NO_LOGIN_LINKS.map(async ({ name, href }) => {
      const link = page.getByRole('link', { name });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', href);
    }));
  });

  test('TC05 - Verify main navigation items are displayed', async ({ page }) => {
    await Promise.all(NAV_ITEMS.map((name) => expect(page.getByTitle(name)).toBeVisible()));
  });

  test('TC06 - Verify all service cards render with correct headings and links', async ({ page }) => {
    const cardsService = page.locator('.cards-service');
    await expect(cardsService.locator('li')).toHaveCount(SERVICE_CARDS.length);
    await Promise.all(SERVICE_CARDS.map(async ({ name, href }) => {
      const link = cardsService.getByRole('link', { name, exact: false });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', href);
    }));
  });

  test('TC07 - Verify promotional section is displayed', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'State Farm can help protect you and your business' }),
    ).toBeVisible();

    // the authored link list is decorated into a native <select> dropdown
    const promoOption = page.locator('.columns-promo select option', { hasText: 'Car insurance' });
    await expect(promoOption).toHaveCount(1);
    await expect(promoOption).toHaveAttribute('value', 'https://www.statefarm.com/insurance/auto');
  });

  test('TC08 - Verify hovering a nav item opens its mega-menu panel', async ({ page }) => {
    await expect(page.locator('.nav-drop-panel.open')).toHaveCount(0);

    const claimsDrop = page.locator('.nav-drop', { has: page.getByTitle('Claims') });
    await claimsDrop.hover();

    const openPanel = page.locator('.nav-drop-panel.open');
    await expect(openPanel).toHaveCount(1);
    await expect(openPanel.locator('.nav-drop-title')).toHaveText('Claims');
    await expect(page.getByRole('link', { name: 'Auto Repair Facility Survey', exact: true })).toBeVisible();
  });

  test('TC09 - Verify mega-menu closes on Escape', async ({ page }) => {
    const claimsDrop = page.locator('.nav-drop', { has: page.getByTitle('Claims') });
    await claimsDrop.hover();
    await expect(page.locator('.nav-drop-panel.open')).toHaveCount(1);

    await page.keyboard.press('Escape');

    await expect(page.locator('.nav-drop-panel.open')).toHaveCount(0);
  });

  test('TC10 - Verify simulated login updates the header and hides anonymous-only content', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.getByTitle('Log In')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No login required:' })).toBeVisible();

    await header.getByTitle('Log In').click();

    await expect(page).toHaveURL(/loggedIn=true/);
    await expect(page.locator('body')).toHaveClass(/auth-authenticated/);
    await expect(header.getByTitle('Log Out')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No login required:' })).toBeHidden();
  });

  test('TC11 - Verify simulated logout reverts to the anonymous state', async ({ page }) => {
    const header = page.locator('header');
    await header.getByTitle('Log In').click();
    await expect(header.getByTitle('Log Out')).toBeVisible();

    await header.getByTitle('Log Out').click();

    await expect(page).not.toHaveURL(/loggedIn=true/);
    await expect(page.locator('body')).toHaveClass(/auth-anonymous/);
    await expect(header.getByTitle('Log In')).toBeVisible();
  });
});

test.describe('B2B Home Page - mobile navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME_PATH);
  });

  test('TC12 - Verify hamburger menu toggles the mobile nav', async ({ page }) => {
    const hamburger = page.locator('.nav-hamburger button');
    await expect(hamburger).toBeVisible();
    const initialState = await hamburger.getAttribute('aria-expanded');

    await hamburger.click();
    await expect(hamburger).not.toHaveAttribute('aria-expanded', initialState);

    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', initialState);
  });
});
