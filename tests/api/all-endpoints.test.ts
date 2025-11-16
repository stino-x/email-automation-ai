import { test, expect } from '@playwright/test';

test.describe('ALL API Endpoints - Complete Coverage', () => {
  const userId = process.env.TEST_USER_ID || 'test-user-id';
  const baseUrl = 'http://localhost:3000';

  test.describe('Status API', () => {
    test('GET /api/status - should return system status', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/status`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('worker');
      expect(data).toHaveProperty('google_gmail');
      expect(data).toHaveProperty('google_calendar');
      expect(data).toHaveProperty('groq_api');
    });

    test('GET /api/status - should return 401 without user-id', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/status`);
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Configuration API', () => {
    test('POST /api/config/save - should save configuration', async ({ request }) => {
      const config = {
        configuration: {
          monitored_emails: [{
            email_address: 'test@example.com',
            sender_email: 'test@example.com',
            keywords: ['urgent'],
            schedule: {
              type: 'recurring',
              days_of_week: [1, 2, 3, 4, 5],
              time_window_start: '09:00',
              time_window_end: '17:00',
              check_interval_minutes: 15
            },
            stop_after_response: 'never',
            is_active: true,
            schedule_type: 'recurring',
            recurring_config: {
              days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              start_time: '09:00',
              end_time: '17:00',
              interval_minutes: 15
            }
          }],
          ai_prompt_template: 'Test prompt',
          is_active: false,
          max_emails_per_period: 10,
          once_per_window: true,
          calendar_id: 'primary'
        }
      };

      const response = await request.post(`${baseUrl}/api/config/save`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        data: config
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('POST /api/config/save - should reject invalid config', async ({ request }) => {
      const invalidConfig = {
        configuration: {
          monitored_emails: [{
            email_address: 'test@example.com',
            sender_email: 'test@example.com',
            schedule: {
              type: 'recurring',
              days_of_week: [],
              time_window_start: '17:00',
              time_window_end: '09:00',
              check_interval_minutes: -5
            },
            stop_after_response: 'never',
            is_active: true,
            schedule_type: 'recurring'
          }],
          ai_prompt_template: '',
          is_active: false
        }
      };

      const response = await request.post(`${baseUrl}/api/config/save`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        data: invalidConfig
      });

      expect(response.status()).toBe(400);
    });

    test('GET /api/config/get - should retrieve configuration', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/config/get`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('configuration');
    });
  });

  test.describe('Check Counts API', () => {
    test('GET /api/check-counts - should return check counters', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/check-counts`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/reset-counts - should reset counters', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/reset-counts`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Activity Logs API', () => {
    test('GET /api/logs - should return activity logs', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/logs`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  test.describe('Service Control API', () => {
    test('POST /api/service/start - should start worker', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/service/start`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('POST /api/service/stop - should stop worker', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/service/stop`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Google Auth API', () => {
    test('GET /api/auth/google - should initiate OAuth flow', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/auth/google?user_id=${userId}`);
      
      // Should redirect to Google
      expect([302, 303, 307, 308]).toContain(response.status());
    });

    test('GET /api/auth/google/status - should return auth status', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/auth/google/status`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('hasGoogleAuth');
    });

    test('DELETE /api/auth/google - should disconnect account', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/auth/google`, {
        headers: { 'x-user-id': userId }
      });

      expect([200, 204]).toContain(response.status());
    });
  });

  test.describe('Facebook Auth API', () => {
    test('POST /api/facebook/auth - should authenticate with credentials', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/facebook/auth`, {
        data: {
          username: process.env.FACEBOOK_AUTH_USERNAME || 'admin',
          password: process.env.FACEBOOK_AUTH_PASSWORD || 'password'
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('POST /api/facebook/auth - should reject invalid credentials', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/facebook/auth`, {
        data: {
          username: 'wrong',
          password: 'wrong'
        }
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Facebook Config API', () => {
    test('GET /api/facebook/config/get - should return Facebook config', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/facebook/config/get`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
    });

    test('POST /api/facebook/config/save - should save Facebook config', async ({ request }) => {
      const config = {
        monitored_conversations: [{
          thread_id: 'test123',
          participant_name: 'Test User',
          keywords: ['hello'],
          is_active: true
        }],
        ai_prompt_template: 'Test prompt',
        check_interval_minutes: 5
      };

      const response = await request.post(`${baseUrl}/api/facebook/config/save`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        data: { configuration: config }
      });

      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Facebook Service API', () => {
    test('POST /api/facebook/service/toggle - should toggle Facebook service', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/facebook/service/toggle`, {
        headers: { 'x-user-id': userId },
        data: { is_active: true }
      });

      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Facebook Logs API', () => {
    test('GET /api/facebook/logs - should return Facebook logs', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/facebook/logs`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  test.describe('Debug API', () => {
    test('GET /api/debug/user-info - should return user info', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/debug/user-info`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Test API', () => {
    test('POST /api/test - should run test email processing', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/test`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });
  });

  test.describe('Admin API', () => {
    test('POST /api/admin/sync-all-users - should sync all users', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/admin/sync-all-users`);
      
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Auth Sync API', () => {
    test('POST /api/auth/sync-user - should sync user tokens', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/auth/sync-user`, {
        headers: { 'x-user-id': userId }
      });

      expect(response.ok()).toBeTruthy();
    });
  });
});
