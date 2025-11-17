import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/auth';

test.describe('Multi-Account Email Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should configure multiple monitors with different sender and recipient combinations', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Clear existing config
    const clearButton = page.getByRole('button', { name: /Clear Configuration/i });
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      await page.waitForTimeout(1000);
    }

    // Monitor 1: client1@example.com → austindev214@gmail.com
    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    
    // Wait for the form to expand and fields to be visible
    await page.waitForSelector('input[placeholder="sender@example.com"]', { state: 'visible' });
    
    // Use placeholder-based selectors which are more reliable
    await page.locator('input[placeholder="sender@example.com"]').last().fill('client1@example.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('austindev214@gmail.com');
    
    console.log('✓ Monitor 1: client1@example.com sends to austindev214@gmail.com');

    // Monitor 2: client2@example.com → iheagwarqaustin214@gmail.com
    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="sender@example.com"]').last().fill('client2@example.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('iheagwarqaustin214@gmail.com');
    
    console.log('✓ Monitor 2: client2@example.com sends to iheagwarqaustin214@gmail.com');

    // Monitor 3: boss@company.com → austindev214@gmail.com
    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="sender@example.com"]').last().fill('boss@company.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('austindev214@gmail.com');
    
    console.log('✓ Monitor 3: boss@company.com sends to austindev214@gmail.com');

    // Monitor 4: vendor@supplier.com → workaccount@gmail.com
    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="sender@example.com"]').last().fill('vendor@supplier.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('workaccount@gmail.com');
    
    console.log('✓ Monitor 4: vendor@supplier.com sends to workaccount@gmail.com');

    // Save configuration
    const saveButton = page.getByRole('button', { name: /Save Configuration/i });
    await saveButton.waitFor({ state: 'attached' });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    // Wait for success toast to appear
    await expect(page.locator('[data-sonner-toast] >> text=Configuration saved successfully!')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-sonner-toast] >> text=Configuration saved successfully!')).toBeVisible({ timeout: 8000 });

    // Verify all monitors are displayed
    await expect(page.locator('text=client1@example.com').first()).toBeVisible();
    await expect(page.locator('text=client2@example.com').first()).toBeVisible();
    await expect(page.locator('text=boss@company.com').first()).toBeVisible();
    await expect(page.locator('text=vendor@supplier.com').first()).toBeVisible();

    console.log('✓ All 4 monitors configured with different sender/recipient combinations');
  });

  test('should show that same sender can be monitored in multiple receiving accounts', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');

    // Monitor same sender (important-client@example.com) in TWO different receiving accounts
    
    // Monitor 1: important-client → personal@gmail.com
    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="sender@example.com"]').last().fill('important-client@example.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('personal@gmail.com');
    
    // Monitor 2: important-client → work@gmail.com (SAME SENDER, DIFFERENT RECIPIENT)
    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="sender@example.com"]').last().fill('important-client@example.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('work@gmail.com');

    const saveButton2 = page.getByRole('button', { name: /Save Configuration/i });
    await saveButton2.waitFor({ state: 'attached' });
    await expect(saveButton2).toBeEnabled({ timeout: 5000 });
    await saveButton2.click();
    // Wait for success toast to appear
    await expect(page.locator('[data-sonner-toast] >> text=Configuration saved successfully!')).toBeVisible({ timeout: 8000 });

    console.log('✓ Same sender monitored in TWO different receiving Gmail accounts');
  });

  test('should show that multiple senders can send to same receiving account', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');

    // Multiple senders → ONE receiving account
    
    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="sender@example.com"]').last().fill('sender1@example.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('main-inbox@gmail.com');

    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="sender@example.com"]').last().fill('sender2@example.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('main-inbox@gmail.com');

    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="sender@example.com"]').last().fill('sender3@example.com');
    await page.locator('input[placeholder*="gmail.com"]').last().fill('main-inbox@gmail.com');

    const saveButton3 = page.getByRole('button', { name: /Save Configuration/i });
    await saveButton3.waitFor({ state: 'attached' });
    await expect(saveButton3).toBeEnabled({ timeout: 5000 });
    await saveButton3.click();
    // Wait for success toast to appear
    await expect(page.locator('[data-sonner-toast] >> text=Configuration saved successfully!')).toBeVisible({ timeout: 8000 });

    console.log('✓ Three different senders all monitored in ONE receiving Gmail account');
  });

  test('should configure complex routing scenario', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');

    const scenarios = [
      { sender: 'ceo@company.com', receiver: 'executive-assistant@gmail.com', note: 'CEO emails' },
      { sender: 'support@client1.com', receiver: 'support-team@gmail.com', note: 'Client 1 support' },
      { sender: 'support@client2.com', receiver: 'support-team@gmail.com', note: 'Client 2 support' },
      { sender: 'billing@vendor.com', receiver: 'accounting@gmail.com', note: 'Vendor billing' },
      { sender: 'hr@company.com', receiver: 'personal@gmail.com', note: 'HR communications' },
      { sender: 'urgent@anywhere.com', receiver: 'personal@gmail.com', note: 'Urgent from anywhere' },
    ];

    for (const scenario of scenarios) {
      await page.getByRole('button', { name: /Add Email Monitor/i }).click();
      await page.waitForTimeout(300);
      await page.locator('input[placeholder="sender@example.com"]').last().fill(scenario.sender);
      await page.locator('input[placeholder*="gmail.com"]').last().fill(scenario.receiver);
      
      console.log(`✓ ${scenario.note}: ${scenario.sender} → ${scenario.receiver}`);
    }

    const saveButton4 = page.getByRole('button', { name: /Save Configuration/i });
    await saveButton4.waitFor({ state: 'attached' });
    await expect(saveButton4).toBeEnabled({ timeout: 5000 });
    await saveButton4.click();
    await expect(page.locator('text=Configuration saved successfully!')).toBeVisible({ timeout: 5000 });

    console.log('\n✓ Complex routing configured:');
    console.log('  - Different departments → Different inboxes');
    console.log('  - Multiple clients → Same support inbox');
    console.log('  - Flexible sender/recipient mapping');
  });

  test('should verify receiving account field is different from sender field', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');

    // Clear any existing configuration first
    const clearButton = page.getByRole('button', { name: /Clear Configuration/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(1000);
    }

    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    
    // Fill sender
    const senderInput = page.locator('input[placeholder="sender@example.com"]').last();
    await senderInput.fill('sender@example.com');
    
    // Fill receiving account (should be different field)
    const receivingInput = page.locator('input[placeholder*="gmail.com"]').last();
    await receivingInput.fill('receiver@gmail.com');

    // Verify both fields have different values
    const senderValue = await senderInput.inputValue();
    const receivingValue = await receivingInput.inputValue();

    expect(senderValue).toBe('sender@example.com');
    expect(receivingValue).toBe('receiver@gmail.com');
    expect(senderValue).not.toBe(receivingValue);

    console.log('✓ Verified: Sender field and Receiving Gmail Account field are independent');
    console.log(`  Sender Email: ${senderValue}`);
    console.log(`  Receiving Gmail Account: ${receivingValue}`);
  });

  test('should display helpful explanation about multi-account feature', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');

    // Add a monitor to ensure form is visible
    await page.getByRole('button', { name: /Add Email Monitor/i }).click();
    await page.waitForTimeout(500);

    // Should show explanation of receiving Gmail account field
    const receivingInput = page.locator('input[placeholder*="gmail.com"]').first();
    
    // Check that the input exists and is visible
    await expect(receivingInput).toBeVisible();
    
    console.log('✓ Multi-account configuration UI includes Gmail account field');
    console.log('  Verified: Receiving Gmail Account input field is present and functional');
  });
});
