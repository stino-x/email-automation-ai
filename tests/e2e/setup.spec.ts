import { test as setup } from '@playwright/test';

// This file creates the test user for all other tests
setup('create test user', async ({ page }) => {
  console.log('Setting up test user...');
  
  // Go to signup page
  await page.goto('http://localhost:3000/signup');
  await page.waitForLoadState('networkidle');
  
  // Fill signup form
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
  
  // Submit signup
  await page.click('button[type="submit"]');
  
  // Wait for redirect (might go to dashboard or login)
  await page.waitForTimeout(5000);
  
  console.log('After signup, URL:', page.url());
  
  // If we're on login page, that's fine - user was created
  // If we're on dashboard, even better - user was created and logged in
  // If we're still on signup, there might be an error (like user already exists)
  
  if (page.url().includes('signup')) {
    // Check for "user already exists" type error - this is actually good for our tests
    const errorElements = await page.locator('text=already, text=exists, text=registered').all();
    let userExists = false;
    
    for (const element of errorElements) {
      if (await element.isVisible()) {
        console.log('User might already exist:', await element.textContent());
        userExists = true;
        break;
      }
    }
    
    if (!userExists) {
      console.log('❌ Signup might have failed for unknown reason');
    } else {
      console.log('✅ User already exists, which is fine for testing');
    }
  } else {
    console.log('✅ Signup successful, user created');
  }
  
  // Now test login to make sure it works
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
  await page.click('button[type="submit"]');
  
  // Wait and check if login worked
  await page.waitForTimeout(5000);
  
  if (page.url().includes('dashboard')) {
    console.log('✅ Login test successful - test user is ready!');
  } else {
    console.log('❌ Login test failed - URL:', page.url());
    throw new Error('Test user setup failed - cannot login');
  }
});