import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should handle invalid login', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // Should show error toast
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('should successfully sign up new user', async ({ page }) => {
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    
    await page.goto('http://localhost:3000/signup');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Assuming user is logged in
    await page.goto('http://localhost:3000/dashboard');
    await page.click('text=Logout');
    
    // Should redirect to home
    await expect(page).toHaveURL('http://localhost:3000/');
  });
});
