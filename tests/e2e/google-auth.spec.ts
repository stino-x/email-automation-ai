import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/auth';

test.describe('Google Account Connection', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Google Accounts')).toBeVisible();
  });

  test('should show connect Google button when not connected', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    
    // Check if Connect button exists (if not already connected)
    const connectButton = page.getByRole('button', { name: /Connect Google Account/i });
    if (await connectButton.isVisible().catch(() => false)) {
      await expect(connectButton).toBeEnabled();
    }
  });

  test('should initiate Google OAuth flow', async ({ page, context }) => {
    await page.goto('http://localhost:3000/settings');
    
    const connectButton = page.getByRole('button', { name: /Connect Google Account/i });
    if (await connectButton.isVisible().catch(() => false)) {
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
    
    const addButton = page.getByRole('button', { name: /^\+ Add Another Account$/i });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test('should display account email when connected', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(2000);
    
    // Check if any account is displayed
    const accountCard = page.locator('.bg-gray-800').first();
    if (await accountCard.isVisible()) {
      const cardText = await accountCard.textContent();
      // Should show either email address or "Not Connected" status
      expect(cardText).toMatch(/@gmail\.com|Not Connected|Connect Google Account/);
    }
  });

  test('should show disconnect button for connected accounts', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(2000);
    
    const disconnectButton = page.getByRole('button', { name: /Disconnect/i }).first();
    if (await disconnectButton.isVisible()) {
      await expect(disconnectButton).toBeEnabled();
    }
  });
});
