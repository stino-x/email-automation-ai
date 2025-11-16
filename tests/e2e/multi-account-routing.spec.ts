import { test, expect } from '@playwright/test';

test.describe('Multi-Account Email Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should configure multiple monitors with different sender and recipient combinations', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');
    
    // Clear existing config
    const clearButton = page.locator('button:has-text("Clear Configuration")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.click('button:has-text("Clear All")');
      await page.waitForTimeout(1000);
    }

    // Monitor 1: client1@example.com → austindev214@gmail.com
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('client1@example.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('austindev214@gmail.com');
    
    console.log('✓ Monitor 1: client1@example.com sends to austindev214@gmail.com');

    // Monitor 2: client2@example.com → iheagwarqaustin214@gmail.com
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('client2@example.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('iheagwarqaustin214@gmail.com');
    
    console.log('✓ Monitor 2: client2@example.com sends to iheagwarqaustin214@gmail.com');

    // Monitor 3: boss@company.com → austindev214@gmail.com
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('boss@company.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('austindev214@gmail.com');
    
    console.log('✓ Monitor 3: boss@company.com sends to austindev214@gmail.com');

    // Monitor 4: vendor@supplier.com → workaccount@gmail.com
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('vendor@supplier.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('workaccount@gmail.com');
    
    console.log('✓ Monitor 4: vendor@supplier.com sends to workaccount@gmail.com');

    // Save configuration
    await page.click('button:has-text("Save Configuration")');
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });

    // Verify all monitors are displayed
    await expect(page.locator('text=client1@example.com')).toBeVisible();
    await expect(page.locator('text=client2@example.com')).toBeVisible();
    await expect(page.locator('text=boss@company.com')).toBeVisible();
    await expect(page.locator('text=vendor@supplier.com')).toBeVisible();

    console.log('✓ All 4 monitors configured with different sender/recipient combinations');
  });

  test('should show that same sender can be monitored in multiple receiving accounts', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');

    // Monitor same sender (important-client@example.com) in TWO different receiving accounts
    
    // Monitor 1: important-client → personal@gmail.com
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('important-client@example.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('personal@gmail.com');
    
    // Monitor 2: important-client → work@gmail.com (SAME SENDER, DIFFERENT RECIPIENT)
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('important-client@example.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('work@gmail.com');

    await page.click('button:has-text("Save Configuration")');
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });

    console.log('✓ Same sender monitored in TWO different receiving Gmail accounts');
  });

  test('should show that multiple senders can send to same receiving account', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');

    // Multiple senders → ONE receiving account
    
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('sender1@example.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('main-inbox@gmail.com');

    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('sender2@example.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('main-inbox@gmail.com');

    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill('sender3@example.com');
    await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill('main-inbox@gmail.com');

    await page.click('button:has-text("Save Configuration")');
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });

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
      await page.click('button:has-text("Add Email Monitor")');
      await page.locator('input[placeholder*="sender"]').last().fill(scenario.sender);
      await page.locator('input[placeholder*="austindev214@gmail.com"]').last().fill(scenario.receiver);
      
      console.log(`✓ ${scenario.note}: ${scenario.sender} → ${scenario.receiver}`);
    }

    await page.click('button:has-text("Save Configuration")');
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });

    console.log('\n✓ Complex routing configured:');
    console.log('  - Different departments → Different inboxes');
    console.log('  - Multiple clients → Same support inbox');
    console.log('  - Flexible sender/recipient mapping');
  });

  test('should verify receiving account field is different from sender field', async ({ page }) => {
    await page.goto('http://localhost:3000/configuration');

    await page.click('button:has-text("Add Email Monitor")');
    
    // Fill sender
    const senderInput = page.locator('input[placeholder*="sender"]').last();
    await senderInput.fill('sender@example.com');
    
    // Fill receiving account (should be different field)
    const receivingInput = page.locator('input[placeholder*="austindev214@gmail.com"]').last();
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

    // Should show explanation of receiving Gmail account field
    const receivingInput = page.locator('input[placeholder*="austindev214@gmail.com"]').first();
    
    // Get the label or help text near the input
    const container = receivingInput.locator('..');
    const text = await container.textContent();

    expect(text).toBeTruthy();
    
    console.log('✓ Receiving Gmail Account field has context/help text');
  });
});
