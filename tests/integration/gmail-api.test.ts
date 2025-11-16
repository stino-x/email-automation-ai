import { test, expect } from '@playwright/test';
import { google } from 'googleapis';

test.describe('Gmail API Integration', () => {
  let oauth2Client: any;
  let gmail: any;

  test.beforeAll(async () => {
    // Setup OAuth2 client with test credentials
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: process.env.TEST_GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.TEST_GOOGLE_REFRESH_TOKEN,
    });

    gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  });

  test('should connect to Gmail API successfully', async () => {
    const response = await gmail.users.getProfile({ userId: 'me' });
    expect(response.status).toBe(200);
    expect(response.data.emailAddress).toBeTruthy();
  });

  test('should list unread emails', async () => {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('messages');
  });

  test('should search for emails from specific sender', async () => {
    const testSender = process.env.TEST_SENDER_EMAIL || 'test@example.com';
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${testSender}`,
      maxResults: 5,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('messages');
  });

  test('should retrieve full email content', async () => {
    // Get first message
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
    });

    if (listResponse.data.messages && listResponse.data.messages.length > 0) {
      const messageId = listResponse.data.messages[0].id;

      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      expect(messageResponse.status).toBe(200);
      expect(messageResponse.data.payload).toBeTruthy();
      expect(messageResponse.data.payload.headers).toBeTruthy();
    }
  });

  test('should send an email successfully', async () => {
    const timestamp = Date.now();
    const subject = `Test Email ${timestamp}`;
    const body = `This is a test email sent at ${new Date().toISOString()}`;
    
    const email = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `to: ${process.env.TEST_RECIPIENT_EMAIL}\n`,
      `subject: ${subject}\n\n`,
      body
    ].join('');

    const encodedMessage = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.id).toBeTruthy();
    expect(response.data.labelIds).toContain('SENT');
  });

  test('should reply to an email', async () => {
    // Get first unread message
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 1,
    });

    if (listResponse.data.messages && listResponse.data.messages.length > 0) {
      const originalMessage = listResponse.data.messages[0];
      const messageDetails = await gmail.users.messages.get({
        userId: 'me',
        id: originalMessage.id,
        format: 'full',
      });

      const headers = messageDetails.data.payload.headers;
      const from = headers.find((h: any) => h.name === 'From')?.value;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value;
      const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value;

      const replyEmail = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `to: ${from}\n`,
        `subject: Re: ${subject}\n`,
        `In-Reply-To: ${messageId}\n`,
        `References: ${messageId}\n\n`,
        'This is an automated test reply.'
      ].join('');

      const encodedReply = Buffer.from(replyEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedReply,
          threadId: originalMessage.threadId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.threadId).toBe(originalMessage.threadId);
    }
  });

  test('should mark email as read', async () => {
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 1,
    });

    if (listResponse.data.messages && listResponse.data.messages.length > 0) {
      const messageId = listResponse.data.messages[0].id;

      const response = await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.labelIds).not.toContain('UNREAD');
    }
  });

  test('should filter emails by keyword', async () => {
    const keywords = ['urgent', 'important', 'meeting'];
    const keywordQuery = keywords.map(k => `"${k}"`).join(' OR ');

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `(${keywordQuery})`,
      maxResults: 10,
    });

    expect(response.status).toBe(200);
  });

  test('should handle Gmail API rate limits gracefully', async () => {
    const requests = [];
    
    // Make 10 rapid requests
    for (let i = 0; i < 10; i++) {
      requests.push(
        gmail.users.messages.list({
          userId: 'me',
          maxResults: 1,
        })
      );
    }

    const results = await Promise.allSettled(requests);
    
    // At least some should succeed
    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThan(0);
  });

  test('should verify email has expected structure', async () => {
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
    });

    if (response.data.messages && response.data.messages.length > 0) {
      const messageId = response.data.messages[0].id;
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      expect(message.data).toHaveProperty('id');
      expect(message.data).toHaveProperty('threadId');
      expect(message.data).toHaveProperty('labelIds');
      expect(message.data).toHaveProperty('payload');
      expect(message.data.payload).toHaveProperty('headers');
    }
  });
});
