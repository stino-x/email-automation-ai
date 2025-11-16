import { describe, it, expect } from '@jest/globals';
import { 
  validateScheduleConfig, 
  isInSchedule, 
  getMaxChecksForPeriod,
  estimateSchedule 
} from '@/lib/utils/scheduling';
import type { MonitoredEmail } from '@/types';

describe('Schedule Validation', () => {
  it('should validate recurring schedule with all required fields', () => {
    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [1, 2, 3, 4, 5],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: 15,
        max_checks_per_day: 30
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring',
      recurring_config: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time: '09:00',
        end_time: '17:00',
        interval_minutes: 15,
        max_checks_per_day: 30
      }
    };

    const result = validateScheduleConfig(monitor);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid time window', () => {
    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [1, 2, 3, 4, 5],
        time_window_start: '17:00',
        time_window_end: '09:00',
        check_interval_minutes: 15
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring',
      recurring_config: {
        days: ['monday'],
        start_time: '17:00',
        end_time: '09:00',
        interval_minutes: 15
      }
    };

    const result = validateScheduleConfig(monitor);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('time window'))).toBe(true);
  });

  it('should accept optional max_checks_per_day', () => {
    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [1, 2, 3, 4, 5],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: 15
        // max_checks_per_day is undefined (unlimited)
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring',
      recurring_config: {
        days: ['monday'],
        start_time: '09:00',
        end_time: '17:00',
        interval_minutes: 15
        // max_checks_per_day is undefined
      }
    };

    const result = validateScheduleConfig(monitor);
    expect(result.valid).toBe(true);
  });

  it('should reject negative check interval', () => {
    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [1],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: -5
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring',
      recurring_config: {
        days: ['monday'],
        start_time: '09:00',
        end_time: '17:00',
        interval_minutes: -5
      }
    };

    const result = validateScheduleConfig(monitor);
    expect(result.valid).toBe(false);
  });
});

describe('Schedule Time Checking', () => {
  it('should return true when current time is within schedule', () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [currentDay],
        time_window_start: String(currentHour).padStart(2, '0') + ':00',
        time_window_end: String(currentHour + 1).padStart(2, '0') + ':00',
        check_interval_minutes: 15
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring'
    };

    const result = isInSchedule(monitor);
    expect(result).toBe(true);
  });

  it('should return false when current day is not in schedule', () => {
    const now = new Date();
    const currentDay = now.getDay();
    const otherDay = (currentDay + 1) % 7;

    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [otherDay],
        time_window_start: '00:00',
        time_window_end: '23:59',
        check_interval_minutes: 15
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring'
    };

    const result = isInSchedule(monitor);
    expect(result).toBe(false);
  });
});

describe('Max Checks Calculation', () => {
  it('should return Infinity when max_checks is undefined', () => {
    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [1, 2, 3, 4, 5],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: 15
        // max_checks_per_day undefined
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring'
    };

    const result = getMaxChecksForPeriod(monitor, '2024-01-15');
    expect(result).toBe(Infinity);
  });

  it('should return max_checks_per_day for recurring schedule', () => {
    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [1, 2, 3, 4, 5],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: 15,
        max_checks_per_day: 50
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring'
    };

    const result = getMaxChecksForPeriod(monitor, '2024-01-15');
    expect(result).toBe(50);
  });
});

describe('Schedule Estimation', () => {
  it('should estimate checks for 8-hour window with 15-min intervals', () => {
    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [1, 2, 3, 4, 5],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: 15,
        max_checks_per_day: 100
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring',
      recurring_config: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time: '09:00',
        end_time: '17:00',
        interval_minutes: 15,
        max_checks_per_day: 100
      }
    };

    const result = estimateSchedule(monitor);
    expect(result.checks_per_day).toBe(32); // 8 hours * 60 / 15 = 32
    expect(result.checks_per_week).toBe(160); // 32 * 5 days
  });

  it('should handle unlimited max_checks in estimation', () => {
    const monitor: MonitoredEmail = {
      email_address: 'test@example.com',
      sender_email: 'test@example.com',
      keywords: [],
      schedule: {
        type: 'recurring',
        days_of_week: [1, 2, 3, 4, 5],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: 30
        // No max_checks_per_day
      },
      stop_after_response: 'never',
      is_active: true,
      schedule_type: 'recurring',
      recurring_config: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time: '09:00',
        end_time: '17:00',
        interval_minutes: 30
      }
    };

    const result = estimateSchedule(monitor);
    expect(result.checks_per_day).toBe(16); // 8 hours * 60 / 30 = 16
    expect(result.is_unlimited).toBe(true);
  });
});
