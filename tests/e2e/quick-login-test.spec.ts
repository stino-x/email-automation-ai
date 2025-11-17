// Quick fix: Create test user and run basic login test
import { test, expect } from '@playwright/test';

test.describe('Quick Login Test', () => {
  test('should test login flow step by step', async ({ page }) => {
    console.log('Testing with credentials:', {
      email: process.env.TEST_USER_EMAIL,
      password: '***'
    });
    
    // Go to signup first to create user if it doesn't exist
    await page.goto('http://localhost:3000/signup');
    await page.waitForLoadState('networkidle');
    
    // Try to create the test user
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    
    // Click signup - if user exists, it will fail, that's ok
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Now try login
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');
    
    // Wait and see what happens
    await page.waitForTimeout(5000);
    
    console.log('Final URL:', page.url());
    
    // Check if we're on dashboard or still on login
    if (page.url().includes('dashboard')) {
      console.log('✅ Login successful!');
    } else {
      console.log('❌ Login failed, still on:', page.url());
      
      // Check for errors
      const errorElements = await page.locator('text=error, text=invalid, text=failed').all();
      for (const element of errorElements) {
        if (await element.isVisible()) {
          console.log('Error found:', await element.textContent());
        }
      }
    }
  });
});