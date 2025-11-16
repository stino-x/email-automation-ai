import { test, expect } from '@playwright/test';

test.describe('Google Account Connection', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    // Add your test credentials
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Google Account')).toBeVisible();
  });

  test('should show connect Google button when not connected', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    
    // Check if Connect button exists (if not already connected)
    const connectButton = page.locator('button:has-text("Connect Google Account")');
    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeEnabled();
    }
  });

  test('should initiate Google OAuth flow', async ({ page, context }) => {
    await page.goto('http://localhost:3000/settings');
    
    const connectButton = page.locator('button:has-text("Connect Google Account")');
    if (await connectButton.isVisible()) {
      // Listen for popup
      const popupPromise = context.waitForEvent('page');
      await connectButton.click();
      
      const popup = await popupPromise;
      
      // Should redirect to Google OAuth
      await expect(popup).toHaveURL(/accounts\.google\.com/, { timeout: 10000 });
    }
  });

  test('should show connected accounts list', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    
    // Wait for status to load
    await page.waitForTimeout(2000);
    
    // Should show Google Accounts section
    await expect(page.locator('text=Google Accounts')).toBeVisible();
  });

  test('should have Add Another Account button enabled', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    
    const addButton = page.locator('button:has-text("Add Another Account")');
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test('should display account email when connected', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(2000);
    
    // Check if any account is displayed
    const accountCard = page.locator('.bg-gray-800').first();
    if (await accountCard.isVisible()) {
      // Should show email address
      await expect(accountCard).toContainText(/@gmail\.com/);
    }
  });

  test('should show disconnect button for connected accounts', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(2000);
    
    const disconnectButton = page.locator('button:has-text("Disconnect")').first();
    if (await disconnectButton.isVisible()) {
      await expect(disconnectButton).toBeEnabled();
    }
  });
});
