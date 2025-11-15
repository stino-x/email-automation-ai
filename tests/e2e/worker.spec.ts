import { test, expect } from '@playwright/test';

test.describe('Worker Service Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should show worker status on dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    
    // Should show worker status
    await expect(page.locator('text=Worker')).toBeVisible();
  });

  test('should check worker health from settings', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(2000);
    
    // Should show worker status indicator
    const workerStatus = page.locator('text=Worker').locator('..');
    await expect(workerStatus).toBeVisible();
  });

  test('should start monitoring when config is saved', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add and save a monitor
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('monitor@example.com');
    await page.click('button:has-text("Save Configuration")');
    
    // Should trigger worker notification
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should show activity logs', async ({ page }) => {
    await page.goto('http://localhost:3000/activity');
    
    // Should show activity logs page
    await expect(page.locator('text=Activity')).toBeVisible();
  });
});
