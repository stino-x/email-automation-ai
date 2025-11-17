import { test } from '@playwright/test';

test.describe('Login Debug with Network', () => {
  test('should debug login with network and console logs', async ({ page }) => {
    // Listen to console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    // Listen to network requests
    page.on('response', response => {
      if (response.url().includes('/api/auth') || response.url().includes('login')) {
        console.log('API Response:', response.status(), response.url());
      }
    });
    
    console.log('Testing login with:', {
      email: process.env.TEST_USER_EMAIL,
      password: '***'
    });
    
    // Go to login
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Fill form
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    
    console.log('Submitting login form...');
    
    // Submit and wait for network activity
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/') && response.status() !== 200 ? true : false,
        { timeout: 5000 }
      ).catch(() => console.log('No error response found')),
      page.click('button[type="submit"]')
    ]);
    
    // Wait a bit more
    await page.waitForTimeout(3000);
    
    console.log('Final URL:', page.url());
    
    // Check all visible text for any errors
    const bodyText = await page.locator('body').textContent();
    if (bodyText?.toLowerCase().includes('error') || 
        bodyText?.toLowerCase().includes('invalid') ||
        bodyText?.toLowerCase().includes('wrong')) {
      console.log('Found error in page content:', bodyText);
    }
    
    // Check if there are any form validation messages
    const inputs = await page.locator('input[type="email"], input[type="password"]').all();
    for (const input of inputs) {
      const validationMessage = await input.evaluate((el: HTMLInputElement) => el.validationMessage);
      if (validationMessage) {
        console.log('Input validation error:', validationMessage);
      }
    }
  });
});