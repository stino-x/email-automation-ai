import { test } from '@playwright/test';

test.describe('Login Error Debug', () => {
  test('should capture login errors', async ({ page }) => {
    console.log('Testing login with:', process.env.TEST_USER_EMAIL);
    
    // Capture all console messages including errors
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]:`, msg.text());
    });
    
    // Capture network failures
    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });
    
    // Capture all responses
    page.on('response', response => {
      if (response.url().includes('api') || response.status() >= 400) {
        console.log('API RESPONSE:', response.status(), response.url());
      }
    });
    
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Fill form
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input#password', process.env.TEST_USER_PASSWORD!);
    
    // Click the eye icon to show password and verify it's correct
    console.log('Clicking password toggle to verify credentials...');
    await page.click('[data-testid="password-toggle"]');
    
    // Wait a moment for the password to become visible
    await page.waitForTimeout(500);
    
    // Get the actual values from the form
    const emailValue = await page.inputValue('input[type="email"]');
    const passwordValue = await page.inputValue('input#password');
    
    console.log('Form values - Email:', emailValue, 'Password:', passwordValue);
    console.log('Expected - Email:', process.env.TEST_USER_EMAIL, 'Password:', process.env.TEST_USER_PASSWORD);
    
    // Click toggle again to hide password before submitting
    await page.click('[data-testid="password-toggle"]');
    
    console.log('Clicking submit button...');
    
    // Click submit and wait for any errors
    await page.click('button[type="submit"]');
    
    // Wait longer to see any toast messages or errors
    await page.waitForTimeout(10000);
    
    console.log('Final URL after login attempt:', page.url());
    
    // Check if there are any toast notifications (success or error)
    const toastElements = await page.locator('[data-sonner-toast], .toast, [role="alert"]').all();
    for (const toast of toastElements) {
      if (await toast.isVisible()) {
        const toastText = await toast.textContent();
        console.log('Toast message found:', toastText);
      }
    }
    
    // Check for any visible error messages
    const errorTexts = ['error', 'invalid', 'incorrect', 'failed', 'wrong'];
    for (const errorText of errorTexts) {
      const elements = await page.locator(`text=${errorText}`).all();
      for (const element of elements) {
        if (await element.isVisible()) {
          console.log(`Found "${errorText}" message:`, await element.textContent());
        }
      }
    }
  });
});