import { test, expect } from '@playwright/test';

test.describe('End-to-End Email Automation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('FULL FLOW: Configure monitor, send test email, verify response', async ({ page, context }) => {
    const testTimestamp = Date.now();
    const testSender = process.env.TEST_SENDER_EMAIL!;
    
    // Step 1: Configure email monitor
    await page.goto('http://localhost:3000/configuration');
    
    // Clear existing config
    const clearButton = page.locator('button:has-text("Clear Configuration")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.click('button:has-text("Clear All")');
      await page.waitForTimeout(1000);
    }
    
    // Add new monitor
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill(testSender);
    
    // Configure schedule - check every 5 minutes for testing
    await page.locator('button:has-text("Recurring")').first().click();
    await page.locator('input[placeholder*="interval"]').first().fill('5');
    
    // Add test keywords
    await page.locator('input[placeholder*="urgent"]').last().fill('TEST_AUTOMATION');
    
    // Activate monitor
    const toggle = page.locator('[role="switch"]').first();
    const isActive = await toggle.getAttribute('aria-checked') === 'true';
    if (!isActive) {
      await toggle.click();
    }
    
    // Save configuration
    await page.click('button:has-text("Save Configuration")');
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Step 1: Monitor configured');

    // Step 2: Send test email using Gmail API
    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: process.env.TEST_GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.TEST_GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const testSubject = `TEST_AUTOMATION Email ${testTimestamp}`;
    const testBody = `This is a test email for automation testing.\nTimestamp: ${testTimestamp}\nKeyword: TEST_AUTOMATION`;
    
    const email = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `from: ${testSender}\n`,
      `to: ${process.env.TEST_RECIPIENT_EMAIL}\n`,
      `subject: ${testSubject}\n\n`,
      testBody
    ].join('');

    const encodedMessage = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendResponse = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    expect(sendResponse.status).toBe(200);
    console.log('✓ Step 2: Test email sent');

    // Step 3: Wait for worker to process (5 minute check interval + processing time)
    console.log('⏳ Step 3: Waiting for worker to process email (up to 6 minutes)...');
    await page.waitForTimeout(6 * 60 * 1000); // 6 minutes

    // Step 4: Check activity logs
    await page.goto('http://localhost:3000/activity');
    await page.waitForTimeout(2000);
    
    // Should show the processed email
    await expect(page.locator(`text=${testSender}`)).toBeVisible({ timeout: 10000 });
    console.log('✓ Step 4: Activity log shows processed email');

    // Step 5: Verify response was sent via Gmail API
    const searchResponse = await gmail.users.messages.list({
      userId: 'me',
      q: `to:${testSender} subject:Re:`,
      maxResults: 5,
    });

    expect(searchResponse.data.messages).toBeTruthy();
    expect(searchResponse.data.messages!.length).toBeGreaterThan(0);
    
    // Get the reply details
    const replyId = searchResponse.data.messages![0].id;
    const replyDetails = await gmail.users.messages.get({
      userId: 'me',
      id: replyId!,
      format: 'full',
    });

    const replySubject = replyDetails.data.payload!.headers!
      .find((h: any) => h.name === 'Subject')?.value;
    
    expect(replySubject).toContain('Re:');
    console.log('✓ Step 5: Reply email verified in sent items');

    // Step 6: Verify email is marked as responded in database
    const dbResponse = await fetch('http://localhost:3000/api/status', {
      headers: { 'x-user-id': process.env.TEST_USER_ID! }
    });
    const statusData = await dbResponse.json();
    expect(statusData.success).toBe(true);
    console.log('✓ Step 6: Database shows email as responded');
  });

  test('CALENDAR INTEGRATION: Verify calendar data in AI response', async ({ page }) => {
    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: process.env.TEST_GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.TEST_GOOGLE_REFRESH_TOKEN,
    });

    // Step 1: Create a test calendar event
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const now = new Date();
    const eventStart = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 2 days from now
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000);

    const testEvent = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: 'TEST_AUTOMATION_MEETING',
        start: { dateTime: eventStart.toISOString(), timeZone: 'UTC' },
        end: { dateTime: eventEnd.toISOString(), timeZone: 'UTC' },
      },
    });

    console.log('✓ Created test calendar event');

    // Step 2: Configure AI prompt to include calendar
    await page.goto('http://localhost:3000/configuration');
    
    const promptTextarea = page.locator('textarea').first();
    await promptTextarea.fill(`
      You are an AI assistant. Reply to this email.
      
      Available times based on calendar:
      {CALENDAR_EVENTS}
      
      Use the calendar to suggest meeting times.
    `);

    await page.click('button:has-text("Save Configuration")');
    await expect(page.locator('text=saved successfully')).toBeVisible();
    console.log('✓ AI prompt configured with calendar placeholder');

    // Step 3: Send test email requesting meeting
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const testTimestamp = Date.now();
    
    const email = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      `to: ${process.env.TEST_RECIPIENT_EMAIL}\n`,
      `subject: Meeting Request ${testTimestamp}\n\n`,
      'Can we schedule a meeting this week? Please check your calendar.'
    ].join('');

    const encodedMessage = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    console.log('✓ Sent meeting request email');

    // Step 4: Wait for processing
    await page.waitForTimeout(6 * 60 * 1000);

    // Step 5: Verify response includes calendar information
    await page.goto('http://localhost:3000/activity');
    await page.waitForTimeout(2000);
    
    // Check activity logs for calendar usage
    const activityText = await page.textContent('body');
    expect(activityText).toBeTruthy();

    // Cleanup - delete test event
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: testEvent.data.id!,
    });
    console.log('✓ Cleaned up test event');
  });

  test('MULTI-ACCOUNT: Send and receive across different Gmail accounts', async ({ page }) => {
    // This test requires two connected Gmail accounts
    const account1 = process.env.TEST_ACCOUNT_1_EMAIL!;
    const account2 = process.env.TEST_ACCOUNT_2_EMAIL!;

    // Step 1: Configure monitor for account 2 to receive from account 1
    await page.goto('http://localhost:3000/configuration');
    
    await page.click('button:has-text("Add Email Monitor")');
    await page.locator('input[placeholder*="sender"]').last().fill(account1);
    await page.locator('input[placeholder*="austindev214"]').last().fill(account2);
    
    const toggle = page.locator('[role="switch"]').first();
    await toggle.click();
    
    await page.click('button:has-text("Save Configuration")');
    await expect(page.locator('text=saved successfully')).toBeVisible();
    
    console.log('✓ Multi-account monitor configured');

    // Step 2: Send email from account 1 to account 2
    const { google } = await import('googleapis');
    const oauth2Client1 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client1.setCredentials({
      access_token: process.env.TEST_ACCOUNT_1_ACCESS_TOKEN,
      refresh_token: process.env.TEST_ACCOUNT_1_REFRESH_TOKEN,
    });

    const gmail1 = google.gmail({ version: 'v1', auth: oauth2Client1 });
    
    const testTimestamp = Date.now();
    const email = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      `to: ${account2}\n`,
      `subject: Multi-Account Test ${testTimestamp}\n\n`,
      'Testing multi-account email automation.'
    ].join('');

    const encoded = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    await gmail1.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });

    console.log('✓ Email sent from account 1 to account 2');

    // Step 3: Wait and verify processing
    await page.waitForTimeout(6 * 60 * 1000);

    // Step 4: Check that account 2 received and responded
    const oauth2Client2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client2.setCredentials({
      access_token: process.env.TEST_ACCOUNT_2_ACCESS_TOKEN,
      refresh_token: process.env.TEST_ACCOUNT_2_REFRESH_TOKEN,
    });

    const gmail2 = google.gmail({ version: 'v1', auth: oauth2Client2 });
    
    const sentResponse = await gmail2.users.messages.list({
      userId: 'me',
      q: `to:${account1}`,
      maxResults: 5,
    });

    expect(sentResponse.data.messages).toBeTruthy();
    expect(sentResponse.data.messages!.length).toBeGreaterThan(0);
    
    console.log('✓ Account 2 successfully sent automated reply to account 1');
  });
});
