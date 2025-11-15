import { test, expect } from '@playwright/test';

test.describe('Email Monitor Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should navigate to configuration page', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    await expect(page.locator('text=Edit Config')).toBeVisible();
  });

  test('should display Add Email Monitor button', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    await expect(page.locator('button:has-text("Add Email Monitor")')).toBeVisible();
  });

  test('should add new email monitor', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Click Add Email Monitor
    await page.click('button:has-text("Add Email Monitor")');
    
    // Fill in sender email
    const emailInput = page.locator('input[placeholder*="sender"]').last();
    await emailInput.fill('sender@example.com');
    
    // Should show the new monitor
    await expect(page.locator('text=sender@example.com')).toBeVisible();
  });

  test('should configure recurring schedule', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add monitor if none exists
    const addButton = page.locator('button:has-text("Add Email Monitor")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
    }
    
    // Select Recurring schedule
    await page.locator('button:has-text("Recurring")').first().click();
    
    // Should show day selection
    await expect(page.locator('text=Mon')).toBeVisible();
    await expect(page.locator('text=Tue')).toBeVisible();
  });

  test('should configure specific dates schedule', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add monitor
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
    
    // Select Specific Dates
    await page.locator('button:has-text("Specific Dates")').first().click();
    
    // Should show date picker
    await expect(page.locator('button:has-text("Add Date")')).toBeVisible();
  });

  test('should set calendar ID', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Scroll to calendar section
    await page.locator('text=Calendar Configuration').scrollIntoViewIfNeeded();
    
    const calendarInput = page.locator('input[placeholder*="primary"]');
    await calendarInput.fill('custom-calendar@group.calendar.google.com');
    
    // Value should be set
    await expect(calendarInput).toHaveValue('custom-calendar@group.calendar.google.com');
  });

  test('should preserve calendar ID after save', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    const customCalendarId = 'test-calendar-' + Date.now();
    const calendarInput = page.locator('input[placeholder*="primary"]');
    await calendarInput.fill(customCalendarId);
    
    // Save configuration
    await page.click('button:has-text("Save Configuration")');
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Calendar ID should still be there
    await expect(calendarInput).toHaveValue(customCalendarId);
  });

  test('should set custom AI prompt per monitor', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add monitor
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
    
    // Find custom prompt textarea
    const promptTextarea = page.locator('textarea[placeholder*="custom AI prompt"]').last();
    await promptTextarea.fill('Custom prompt for this specific monitor');
    
    await expect(promptTextarea).toHaveValue('Custom prompt for this specific monitor');
  });

  test('should toggle monitor active/inactive', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add monitor if none
    const addButton = page.locator('button:has-text("Add Email Monitor")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
    }
    
    // Find toggle switch
    const toggle = page.locator('[role="switch"]').first();
    const initialState = await toggle.getAttribute('aria-checked');
    
    // Toggle it
    await toggle.click();
    await page.waitForTimeout(500);
    
    // State should change
    const newState = await toggle.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });

  test('should delete email monitor', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add monitor
    await page.click('button:has-text("Add Email Monitor")');
    const testEmail = 'delete-test@example.com';
    await page.locator('input[placeholder*="sender"]').last().fill(testEmail);
    
    // Find delete button
    const deleteButton = page.locator('button').filter({ hasText: '🗑️' }).last();
    await deleteButton.click();
    
    // Email should be removed
    await expect(page.locator(`text=${testEmail}`)).not.toBeVisible();
  });

  test('should set keywords for email filtering', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add monitor
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
    
    // Find keywords input
    const keywordsInput = page.locator('input[placeholder*="urgent"]').last();
    await keywordsInput.fill('urgent, meeting, important');
    
    await expect(keywordsInput).toHaveValue('urgent, meeting, important');
  });

  test('should save configuration successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Ensure at least one monitor exists
    const monitors = await page.locator('input[placeholder*="sender"]').count();
    if (monitors === 0) {
      await page.click('button:has-text("Add Email Monitor")');
      await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
    }
    
    // Save
    await page.click('button:has-text("Save Configuration")');
    
    // Should show success toast
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should load existing configuration', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Wait for config to load
    await page.waitForTimeout(2000);
    
    // Should show configuration loaded toast or monitors
    const hasMonitors = await page.locator('input[placeholder*="sender"]').count() > 0;
    expect(hasMonitors).toBeTruthy();
  });

  test('should set max checks per day as optional', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add monitor
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
    
    // Find max checks input
    const maxChecksInput = page.locator('input[placeholder*="Unlimited"]').first();
    
    // Leave empty (unlimited)
    await maxChecksInput.clear();
    
    // Save should work
    await page.click('button:has-text("Save Configuration")');
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should set receiving Gmail account', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Add monitor
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('test@example.com');
    
    // Find receiving email input
    const receivingInput = page.locator('input[placeholder*="austindev214@gmail.com"]').last();
    await receivingInput.fill('other-account@gmail.com');
    
    await expect(receivingInput).toHaveValue('other-account@gmail.com');
  });
});
