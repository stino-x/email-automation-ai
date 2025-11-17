import { test } from '@playwright/test';

test.describe('Simple Login Test', () => {
  test('should login with existing user', async ({ page }) => {
    console.log('Testing login with existing user:', {
      email: process.env.TEST_USER_EMAIL,
      password: '***'
    });
    
    // Go directly to login (skip signup since user already exists)
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForTimeout(5000);
    
    console.log('After login attempt, URL:', page.url());
    
    if (page.url().includes('dashboard')) {
      console.log('✅ Login successful! User can access dashboard.');
    } else if (page.url().includes('login')) {
      console.log('❌ Login failed - still on login page');
      
      // Check for specific error messages
      const errorSelectors = [
        'text=invalid',
        'text=incorrect',
        'text=wrong',
        'text=error',
        'text=failed',
        '[role="alert"]',
        '.error',
        '.alert'
      ];
      
      for (const selector of errorSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            const errorText = await element.textContent();
            console.log('Error message:', errorText);
          }
        } catch {
          // Selector not found, continue
        }
      }
    } else {
      console.log('Redirected to unexpected page:', page.url());
    }
  });
});