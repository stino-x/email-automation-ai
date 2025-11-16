import { describe, it, expect } from '@jest/globals';
import { 
  validateScheduleConfig,
  isInSchedule,
  getMaxChecksForPeriod,
  estimateSchedule,
  generateMonitorIdentifier,
  generatePeriodIdentifier
} from '@/lib/utils/scheduling';
import type { MonitoredEmail } from '@/types';

describe('Complete Scheduling Utilities', () => {
  describe('Schedule Validation - All Cases', () => {
    it('should validate perfect recurring config', () => {
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

    it('should reject empty days array', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'recurring',
          days_of_week: [],
          time_window_start: '09:00',
          time_window_end: '17:00',
          check_interval_minutes: 15
        },
        stop_after_response: 'never',
        is_active: true,
        schedule_type: 'recurring',
        recurring_config: {
          days: [],
          start_time: '09:00',
          end_time: '17:00',
          interval_minutes: 15
        }
      };

      const result = validateScheduleConfig(monitor);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid time window (end before start)', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'recurring',
          days_of_week: [1],
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
    });

    it('should accept equal start and end times', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'recurring',
          days_of_week: [1],
          time_window_start: '12:00',
          time_window_end: '12:00',
          check_interval_minutes: 15
        },
        stop_after_response: 'never',
        is_active: true,
        schedule_type: 'recurring',
        recurring_config: {
          days: ['monday'],
          start_time: '12:00',
          end_time: '12:00',
          interval_minutes: 15
        }
      };

      const result = validateScheduleConfig(monitor);
      expect(result.valid).toBe(true);
    });

    it('should reject zero interval', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'recurring',
          days_of_week: [1],
          time_window_start: '09:00',
          time_window_end: '17:00',
          check_interval_minutes: 0
        },
        stop_after_response: 'never',
        is_active: true,
        schedule_type: 'recurring',
        recurring_config: {
          days: ['monday'],
          start_time: '09:00',
          end_time: '17:00',
          interval_minutes: 0
        }
      };

      const result = validateScheduleConfig(monitor);
      expect(result.valid).toBe(false);
    });

    it('should reject negative interval', () => {
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

    it('should accept undefined max_checks (unlimited)', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'recurring',
          days_of_week: [1],
          time_window_start: '09:00',
          time_window_end: '17:00',
          check_interval_minutes: 15
        },
        stop_after_response: 'never',
        is_active: true,
        schedule_type: 'recurring',
        recurring_config: {
          days: ['monday'],
          start_time: '09:00',
          end_time: '17:00',
          interval_minutes: 15
        }
      };

      const result = validateScheduleConfig(monitor);
      expect(result.valid).toBe(true);
    });

    it('should reject zero max_checks', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'recurring',
          days_of_week: [1],
          time_window_start: '09:00',
          time_window_end: '17:00',
          check_interval_minutes: 15,
          max_checks_per_day: 0
        },
        stop_after_response: 'never',
        is_active: true,
        schedule_type: 'recurring',
        recurring_config: {
          days: ['monday'],
          start_time: '09:00',
          end_time: '17:00',
          interval_minutes: 15,
          max_checks_per_day: 0
        }
      };

      const result = validateScheduleConfig(monitor);
      expect(result.valid).toBe(false);
    });

    it('should validate specific dates config', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'specific_dates',
          specific_dates: [{
            date: '2025-01-15',
            time_window_start: '09:00',
            time_window_end: '17:00',
            check_interval_minutes: 15,
            max_checks: 30
          }]
        },
        stop_after_response: 'never',
        is_active: true,
        schedule_type: 'specific_dates',
        specific_dates_config: {
          dates: ['2025-01-15'],
          start_time: '09:00',
          end_time: '17:00',
          interval_minutes: 15,
          max_checks_per_date: 30
        }
      };

      const result = validateScheduleConfig(monitor);
      expect(result.valid).toBe(true);
    });
  });

  describe('Period ID Generation', () => {
    it('should generate daily period IDs', () => {
      const periodId = generatePeriodIdentifier();
      expect(periodId).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should generate same ID for same day', () => {
      const id1 = generatePeriodIdentifier();
      const id2 = generatePeriodIdentifier();
      expect(id1).toBe(id2);
    });
  });

  describe('Monitor ID Generation', () => {
    it('should generate consistent IDs for same monitor', () => {
      const schedule = {
        type: 'recurring' as const,
        days_of_week: [1, 2, 3],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: 15
      };

      const id1 = generateMonitorIdentifier('test@example.com', schedule);
      const id2 = generateMonitorIdentifier('test@example.com', schedule);
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different emails', () => {
      const schedule = {
        type: 'recurring' as const,
        days_of_week: [1, 2, 3],
        time_window_start: '09:00',
        time_window_end: '17:00',
        check_interval_minutes: 15
      };

      const id1 = generateMonitorIdentifier('test1@example.com', schedule);
      const id2 = generateMonitorIdentifier('test2@example.com', schedule);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Max Checks Calculation', () => {
    it('should return Infinity for undefined max_checks', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'recurring',
          days_of_week: [1],
          time_window_start: '09:00',
          time_window_end: '17:00',
          check_interval_minutes: 15
        },
        stop_after_response: 'never',
        is_active: true,
        schedule_type: 'recurring'
      };

      const max = getMaxChecksForPeriod(monitor, '2025-01-15');
      expect(max).toBe(Infinity);
    });

    it('should return defined max_checks value', () => {
      const monitor: MonitoredEmail = {
        email_address: 'test@example.com',
        sender_email: 'test@example.com',
        keywords: [],
        schedule: {
          type: 'recurring',
          days_of_week: [1],
          time_window_start: '09:00',
          time_window_end: '17:00',
          check_interval_minutes: 15,
          max_checks_per_day: 50
        },
        stop_after_response: 'never',
        is_active: true,
        schedule_type: 'recurring'
      };

      const max = getMaxChecksForPeriod(monitor, '2025-01-15');
      expect(max).toBe(50);
    });
  });

  describe('Schedule Estimation', () => {
    it('should estimate 8-hour window with 15-min intervals', () => {
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

      const estimate = estimateSchedule(monitor);
      expect(estimate.checks_per_day).toBe(32);
      expect(estimate.checks_per_week).toBe(160);
    });

    it('should mark as unlimited when no max_checks', () => {
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

      const estimate = estimateSchedule(monitor);
      expect(estimate.is_unlimited).toBe(true);
    });
  });
});
