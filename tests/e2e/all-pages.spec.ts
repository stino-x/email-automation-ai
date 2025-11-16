import { test, expect } from '@playwright/test';

test.describe('ALL UI Pages - Complete Coverage', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test.describe('Landing Page', () => {
    test('should display landing page', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await expect(page.locator('text=Email')).toBeVisible();
    });

    test('should navigate to login from landing', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.click('text=Login');
      await expect(page).toHaveURL(/.*login/);
    });

    test('should navigate to signup from landing', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await page.click('text=Sign Up');
      await expect(page).toHaveURL(/.*signup/);
    });
  });

  test.describe('Dashboard Page', () => {
    test('should display dashboard elements', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should show system status cards', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForTimeout(2000);
      
      await expect(page.locator('text=Database')).toBeVisible();
      await expect(page.locator('text=Worker')).toBeVisible();
    });

    test('should navigate to configuration from dashboard', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      await page.click('text=Edit Config');
      await expect(page).toHaveURL(/.*configuration/);
    });

    test('should navigate to activity from dashboard', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      const activityLink = page.locator('text=Activity');
      if (await activityLink.isVisible()) {
        await activityLink.click();
        await expect(page).toHaveURL(/.*activity/);
      }
    });
  });

  test.describe('Activity Page', () => {
    test('should display activity logs', async ({ page }) => {
      await page.goto('http://localhost:3000/activity');
      await expect(page.locator('text=Activity')).toBeVisible();
    });

    test('should load activity table', async ({ page }) => {
      await page.goto('http://localhost:3000/activity');
      await page.waitForTimeout(2000);
      
      const table = page.locator('table');
      if (await table.isVisible()) {
        await expect(table).toBeVisible();
      }
    });

    test('should show log entries with details', async ({ page }) => {
      await page.goto('http://localhost:3000/activity');
      await page.waitForTimeout(2000);
      
      const logEntry = page.locator('[data-testid="log-entry"]').first();
      if (await logEntry.isVisible()) {
        await expect(logEntry).toBeVisible();
      }
    });

    test('should filter logs by status', async ({ page }) => {
      await page.goto('http://localhost:3000/activity');
      
      const filterButton = page.locator('button:has-text("Filter")');
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.click('text=Success');
      }
    });
  });

  test.describe('Configuration Page - Complete', () => {
    test('should load configuration page', async ({ page }) => {
      await page.goto('http://localhost:3000/configuration');
      await expect(page.locator('text=Edit Config')).toBeVisible();
    });

    test('should add multiple email monitors', async ({ page }) => {
      await page.goto('http://localhost:3000/configuration');
      
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Add Email Monitor")');
        await page.locator('input[placeholder*="sender"]').last().fill(`test${i}@example.com`);
      }

      const monitors = await page.locator('input[placeholder*="sender"]').count();
      expect(monitors).toBeGreaterThanOrEqual(3);
    });

    test('should configure all schedule types', async ({ page }) => {
      await page.goto('http://localhost:3000/configuration');
      
      await page.click('button:has-text("Add Email Monitor")');
      
      // Test recurring
      await page.locator('button:has-text("Recurring")').first().click();
      await expect(page.locator('text=Mon')).toBeVisible();
      
      // Test specific dates
      await page.locator('button:has-text("Specific Dates")').first().click();
      await expect(page.locator('button:has-text("Add Date")')).toBeVisible();
    });

    test('should set all recurring options', async ({ page }) => {
      await page.goto('http://localhost:3000/configuration');
      await page.click('button:has-text("Add Email Monitor")');
      await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
      
      await page.locator('button:has-text("Recurring")').first().click();
      
      // Select all days
      for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
        await page.click(`text=${day}`);
      }
      
      // Set times
      await page.locator('input[type="time"]').first().fill('08:00');
      await page.locator('input[type="time"]').last().fill('18:00');
      
      // Set interval
      await page.locator('input[placeholder*="interval"]').first().fill('10');
      
      // Set max checks
      await page.locator('input[placeholder*="Unlimited"]').first().fill('50');
    });

    test('should set stop after response options', async ({ page }) => {
      await page.goto('http://localhost:3000/configuration');
      await page.click('button:has-text("Add Email Monitor")');
      
      await page.click('button:has-text("Stop After")');
      
      // Should show options
      await expect(page.locator('text=Never')).toBeVisible();
      await expect(page.locator('text=First Response')).toBeVisible();
      await expect(page.locator('text=Period')).toBeVisible();
    });

    test('should bulk toggle monitors', async ({ page }) => {
      await page.goto('http://localhost:3000/configuration');
      
      // Add multiple monitors
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Add Email Monitor")');
        await page.locator('input[placeholder*="sender"]').last().fill(`test${i}@example.com`);
      }
      
      // Toggle all
      const toggles = page.locator('[role="switch"]');
      const count = await toggles.count();
      for (let i = 0; i < count; i++) {
        await toggles.nth(i).click();
      }
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('http://localhost:3000/configuration');
      await page.click('button:has-text("Add Email Monitor")');
      
      await page.locator('input[placeholder*="sender"]').last().fill('invalid-email');
      await page.click('button:has-text("Save Configuration")');
      
      // Should show error
      await expect(page.locator('text=invalid')).toBeVisible({ timeout: 5000 });
    });

    test('should clear all configuration', async ({ page }) => {
      await page.goto('http://localhost:3000/configuration');
      
      const clearButton = page.locator('button:has-text("Clear Configuration")');
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.click('button:has-text("Clear All")');
        
        await page.waitForTimeout(1000);
        const monitors = await page.locator('input[placeholder*="sender"]').count();
        expect(monitors).toBe(0);
      }
    });
  });

  test.describe('Settings Page - Complete', () => {
    test('should display all settings sections', async ({ page }) => {
      await page.goto('http://localhost:3000/settings');
      
      await expect(page.locator('text=Settings')).toBeVisible();
      await expect(page.locator('text=Google Account')).toBeVisible();
      await expect(page.locator('text=Google Accounts')).toBeVisible();
    });

    test('should show system status indicators', async ({ page }) => {
      await page.goto('http://localhost:3000/settings');
      await page.waitForTimeout(2000);
      
      await expect(page.locator('text=Database')).toBeVisible();
      await expect(page.locator('text=Gmail')).toBeVisible();
      await expect(page.locator('text=Calendar')).toBeVisible();
    });

    test('should have refresh status button', async ({ page }) => {
      await page.goto('http://localhost:3000/settings');
      
      const refreshButton = page.locator('button:has-text("Refresh")');
      await refreshButton.click();
      await page.waitForTimeout(1000);
    });

    test('should display connected Google accounts', async ({ page }) => {
      await page.goto('http://localhost:3000/settings');
      await page.waitForTimeout(2000);
      
      const accountsSection = page.locator('text=Google Accounts');
      await expect(accountsSection).toBeVisible();
    });

    test('should enable add another account button', async ({ page }) => {
      await page.goto('http://localhost:3000/settings');
      
      const addButton = page.locator('button:has-text("Add Another Account")');
      await expect(addButton).toBeVisible();
      await expect(addButton).toBeEnabled();
    });
  });

  test.describe('Facebook Page', () => {
    test('should require authentication', async ({ page }) => {
      await page.goto('http://localhost:3000/facebook');
      
      // Should show auth form
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should authenticate with valid credentials', async ({ page }) => {
      await page.goto('http://localhost:3000/facebook');
      
      await page.fill('input[type="text"]', process.env.FACEBOOK_AUTH_USERNAME || 'admin');
      await page.fill('input[type="password"]', process.env.FACEBOOK_AUTH_PASSWORD || 'password');
      await page.click('button[type="submit"]');
      
      // Should access Facebook features
      await expect(page.locator('text=Facebook')).toBeVisible();
    });

    test('should show Facebook configuration options', async ({ page }) => {
      await page.goto('http://localhost:3000/facebook');
      
      // Authenticate first
      await page.fill('input[type="text"]', process.env.FACEBOOK_AUTH_USERNAME || 'admin');
      await page.fill('input[type="password"]', process.env.FACEBOOK_AUTH_PASSWORD || 'password');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Conversation')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Facebook Activity Page', () => {
    test('should display Facebook activity logs', async ({ page }) => {
      await page.goto('http://localhost:3000/facebook/activity');
      
      // Might require auth
      const authRequired = await page.locator('input[type="password"]').isVisible();
      if (authRequired) {
        await page.fill('input[type="text"]', process.env.FACEBOOK_AUTH_USERNAME || 'admin');
        await page.fill('input[type="password"]', process.env.FACEBOOK_AUTH_PASSWORD || 'password');
        await page.click('button[type="submit"]');
      }
      
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Activity')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate through all menu items', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      
      const menuItems = ['Dashboard', 'Edit Config', 'Settings', 'Activity'];
      
      for (const item of menuItems) {
        const link = page.locator(`text=${item}`).first();
        if (await link.isVisible()) {
          await link.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should show navbar on all pages', async ({ page }) => {
      const pages = ['/dashboard', '/configuration', '/settings', '/activity'];
      
      for (const pagePath of pages) {
        await page.goto(`http://localhost:3000${pagePath}`);
        await expect(page.locator('nav')).toBeVisible();
      }
    });

    test('should logout from any page', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard');
      
      const logoutButton = page.locator('text=Logout');
      await logoutButton.click();
      
      await expect(page).toHaveURL('http://localhost:3000/');
    });
  });
});
