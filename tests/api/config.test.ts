import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Configuration API', () => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3000';
  const userId = 'test-user-id';

  beforeAll(async () => {
    // Setup test user and get auth token
    // This would use your actual auth flow
  });

  it('should save configuration', async () => {
    const config = {
      configuration: {
        monitored_emails: [
          {
            email_address: 'test@example.com',
            sender_email: 'test@example.com',
            keywords: ['urgent', 'important'],
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
          }
        ],
        ai_prompt_template: 'Test prompt',
        is_active: false,
        max_emails_per_period: 10,
        once_per_window: true,
        calendar_id: 'primary'
      }
    };

    const response = await fetch(`${baseUrl}/api/config/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(config)
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should get saved configuration', async () => {
    const response = await fetch(`${baseUrl}/api/config/get`, {
      headers: {
        'x-user-id': userId
      }
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.configuration).toBeDefined();
  });

  it('should reject invalid configuration', async () => {
    const invalidConfig = {
      configuration: {
        monitored_emails: [
          {
            email_address: 'test@example.com',
            sender_email: 'test@example.com',
            keywords: [],
            schedule: {
              type: 'recurring',
              days_of_week: [],  // Empty days - invalid
              time_window_start: '17:00',
              time_window_end: '09:00',  // Invalid time window
              check_interval_minutes: -5  // Negative interval - invalid
            },
            stop_after_response: 'never',
            is_active: true,
            schedule_type: 'recurring'
          }
        ],
        ai_prompt_template: '',
        is_active: false,
        max_emails_per_period: 10,
        once_per_window: true
      }
    };

    const response = await fetch(`${baseUrl}/api/config/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(invalidConfig)
    });

    expect(response.status).toBe(400);
  });

  it('should preserve calendar_id after save', async () => {
    const customCalendarId = 'test-calendar@group.calendar.google.com';
    
    const config = {
      configuration: {
        monitored_emails: [],
        ai_prompt_template: 'Test',
        is_active: false,
        max_emails_per_period: 10,
        once_per_window: true,
        calendar_id: customCalendarId
      }
    };

    // Save with custom calendar ID
    await fetch(`${baseUrl}/api/config/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(config)
    });

    // Get config back
    const response = await fetch(`${baseUrl}/api/config/get`, {
      headers: { 'x-user-id': userId }
    });

    const data = await response.json();
    expect(data.configuration.calendar_id).toBe(customCalendarId);
  });
});
