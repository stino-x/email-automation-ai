import { Page, expect } from '@playwright/test';

export async function loginUser(page: Page, email?: string, password?: string) {
  const userEmail = email || process.env.TEST_USER_EMAIL || 'test@example.com';
  const userPassword = password || process.env.TEST_USER_PASSWORD || 'testpass';

  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"]', userEmail);
  await page.fill('input#password', userPassword);

  // Submit and wait for navigation
  await page.click('button[type="submit"]');

  // Wait for either dashboard redirect or error state
  try {
    // Wait up to 10 seconds for dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
  } catch {
    // If dashboard navigation fails, check current URL and handle accordingly
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      // Still on login page, check for errors
      const errorElements = await page.locator('.error, [role="alert"], .toast').all();
      if (errorElements.length > 0) {
        const errorText = await errorElements[0].textContent();
        throw new Error(`Login failed with error: ${errorText}`);
      }
      throw new Error('Login failed - remained on login page');
    } else if (currentUrl.includes('signup')) {
      throw new Error('User might not exist, redirected to signup');
    }
    // If we're not on login or signup, assume login was successful
    console.log(`Login completed, current URL: ${currentUrl}`);
  }

  // Verify we're logged in by checking for user-specific content
  await expect(page.locator('body')).toContainText(/Dashboard|Settings|Configuration/, { timeout: 5000 });
}

export async function logoutUser(page: Page) {
  // Look for logout button or user menu
  const logoutButton = page.getByRole('button', { name: /logout/i });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/.*login/, { timeout: 5000 });
  }
}