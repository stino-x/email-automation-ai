import { test, expect } from '@playwright/test';

test.describe('Login Debug', () => {
  test('should check login page and credentials', async ({ page }) => {
    // Go to login page
    await page.goto('http://localhost:3000/login');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'login-debug.png', fullPage: true });
    
    // Fill credentials
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    
    console.log('Using credentials:', {
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD ? '***' : 'undefined'
    });
    
    // Click submit and see what happens
    await page.click('button[type="submit"]');
    
    // Wait a bit and take another screenshot
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'login-after-submit.png', fullPage: true });
    
    // Check current URL
    console.log('Current URL after login attempt:', page.url());
    
    // Check for error messages
    const errorMessage = page.locator('text=Invalid').first();
    if (await errorMessage.isVisible()) {
      console.log('Error message found:', await errorMessage.textContent());
    }
  });
});