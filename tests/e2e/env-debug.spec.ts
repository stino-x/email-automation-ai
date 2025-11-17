import { test, expect } from '@playwright/test';

test.describe('Environment Debug', () => {
  test('should have access to environment variables', async ({ page }) => {
    console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
    console.log('TEST_USER_EMAIL:', process.env.TEST_USER_EMAIL);
    console.log('TEST_USER_PASSWORD:', process.env.TEST_USER_PASSWORD ? '[SET]' : '[NOT SET]');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('TEST_GOOGLE_ACCESS_TOKEN:', process.env.TEST_GOOGLE_ACCESS_TOKEN ? '[SET]' : '[NOT SET]');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Verify essential variables are present
    expect(process.env.TEST_USER_EMAIL).toBe('austindev214@gmail.com');
    expect(process.env.TEST_USER_PASSWORD).toBeTruthy();
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy();
    
    console.log('✅ All environment variables are loaded correctly!');
    
    // Test if the login page loads properly
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Check if the form fields exist
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input#password');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    console.log('✅ Login form is accessible!');
  });
});