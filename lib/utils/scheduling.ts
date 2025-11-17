import { format, parse } from 'date-fns';
import type { 
  MonitoredEmail, 
  RecurringConfig, 
  SpecificDatesConfig,
  DayOfWeek,
  ScheduleEstimate
} from '@/types';
import { createHash } from 'crypto';

export function isInSchedule(monitor: MonitoredEmail): boolean {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  const currentDay = format(now, 'EEEE').toLowerCase() as DayOfWeek;
  const currentDate = format(now, 'yyyy-MM-dd');

  if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
    return isInRecurringSchedule(currentDay, currentTime, monitor.recurring_config);
  }

  if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
    return isInSpecificDatesSchedule(currentDate, currentTime, monitor.specific_dates_config);
  }

  if (monitor.schedule_type === 'hybrid') {
    const inRecurring = monitor.recurring_config 
      ? isInRecurringSchedule(currentDay, currentTime, monitor.recurring_config)
      : false;
    
    const inSpecific = monitor.specific_dates_config
      ? isInSpecificDatesSchedule(currentDate, currentTime, monitor.specific_dates_config)
      : false;

    return inRecurring || inSpecific;
  }

  return false;
}

function isInRecurringSchedule(
  currentDay: DayOfWeek,
  currentTime: string,
  config: RecurringConfig
): boolean {
  // Check if current day is in the schedule
  if (!config.days.includes(currentDay)) {
    return false;
  }

  // Check if current time is within the time window
  return isTimeInWindow(currentTime, config.start_time, config.end_time);
}

function isInSpecificDatesSchedule(
  currentDate: string,
  currentTime: string,
  config: SpecificDatesConfig
): boolean {
  // Check if current date is in the list
  if (!config.dates.includes(currentDate)) {
    return false;
  }

  // Check if current time is within the time window
  return isTimeInWindow(currentTime, config.start_time, config.end_time);
}

function isTimeInWindow(currentTime: string, startTime: string, endTime: string): boolean {
  const current = parse(currentTime, 'HH:mm', new Date());
  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());

  // Handle case where end time is before start time (crosses midnight)
  if (end < start) {
    return current >= start || current <= end;
  }

  return current >= start && current <= end;
}

export function getNextCheckTime(monitor: MonitoredEmail): Date | null {
  const now = new Date();
  let intervalMinutes = 5; // Default

  if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
    intervalMinutes = monitor.recurring_config.interval_minutes;
  } else if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
    intervalMinutes = monitor.specific_dates_config.interval_minutes;
  }

  // For hybrid, use the smaller interval
  if (monitor.schedule_type === 'hybrid') {
    const recurringInterval = monitor.recurring_config?.interval_minutes || 60;
    const specificInterval = monitor.specific_dates_config?.interval_minutes || 60;
    intervalMinutes = Math.min(recurringInterval, specificInterval);
  }

  const nextCheck = new Date(now.getTime() + intervalMinutes * 60000);
  return nextCheck;
}

export function getMaxChecksForPeriod(monitor: MonitoredEmail, periodIdentifier: string): number {
  // Period identifier format: "YYYY-MM-DD" or "YYYY-WXX-dayname"
  
  if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
    return monitor.recurring_config.max_checks_per_day ?? Infinity;
  }

  if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
    return monitor.specific_dates_config.max_checks_per_date ?? Infinity;
  }

  if (monitor.schedule_type === 'hybrid') {
    // Check if periodIdentifier matches a specific date
    if (monitor.specific_dates_config?.dates.includes(periodIdentifier)) {
      return monitor.specific_dates_config.max_checks_per_date ?? Infinity;
    }
    // Otherwise use recurring max
    return monitor.recurring_config?.max_checks_per_day ?? Infinity;
  }

  return Infinity; // Default should be unlimited
}

export function generateMonitorIdentifier(senderEmail: string, schedule: MonitoredEmail): string {
  const data = JSON.stringify({
    sender: senderEmail,
    type: schedule.schedule_type,
    recurring: schedule.recurring_config,
    specific: schedule.specific_dates_config
  });
  
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function generatePeriodIdentifier(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function generateWindowIdentifier(monitor: MonitoredEmail, date: Date = new Date()): string {
  if (monitor.schedule_type === 'specific_dates') {
    return format(date, 'yyyy-MM-dd');
  }

  // For recurring and hybrid, use week + day format
  const weekNumber = format(date, 'II'); // ISO week number
  const dayName = format(date, 'EEEE').toLowerCase();
  return `${format(date, 'yyyy')}-W${weekNumber}-${dayName}`;
}

export function estimateSchedule(monitor: MonitoredEmail): ScheduleEstimate {
  const estimate: ScheduleEstimate = {};

  if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
    const config = monitor.recurring_config;
    const checksPerDay = calculateChecksInWindow(
      config.start_time,
      config.end_time,
      config.interval_minutes
    );
    
    estimate.checks_per_day = config.max_checks_per_day ? Math.min(checksPerDay, config.max_checks_per_day) : checksPerDay;
    estimate.checks_per_week = estimate.checks_per_day * config.days.length;
    estimate.is_unlimited = config.max_checks_per_day === undefined;
  }

  if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
    const config = monitor.specific_dates_config;
    const checksPerDate = calculateChecksInWindow(
      config.start_time,
      config.end_time,
      config.interval_minutes
    );
    
    const maxPerDate = config.max_checks_per_date ? Math.min(checksPerDate, config.max_checks_per_date) : checksPerDate;
    estimate.total_checks = maxPerDate * config.dates.length;
    estimate.is_unlimited = config.max_checks_per_date === undefined;
  }

  if (monitor.schedule_type === 'hybrid') {
    let totalChecks = 0;
    let hasUnlimited = false;

    if (monitor.recurring_config) {
      const config = monitor.recurring_config;
      const checksPerDay = calculateChecksInWindow(
        config.start_time,
        config.end_time,
        config.interval_minutes
      );
      estimate.checks_per_day = config.max_checks_per_day ? Math.min(checksPerDay, config.max_checks_per_day) : checksPerDay;
      estimate.checks_per_week = estimate.checks_per_day * config.days.length;
      totalChecks += estimate.checks_per_week;
      if (config.max_checks_per_day === undefined) hasUnlimited = true;
    }

    if (monitor.specific_dates_config) {
      const config = monitor.specific_dates_config;
      const checksPerDate = calculateChecksInWindow(
        config.start_time,
        config.end_time,
        config.interval_minutes
      );
      const maxPerDate = config.max_checks_per_date ? Math.min(checksPerDate, config.max_checks_per_date) : checksPerDate;
      totalChecks += maxPerDate * config.dates.length;
      if (config.max_checks_per_date === undefined) hasUnlimited = true;
    }

    estimate.total_checks = totalChecks;
    estimate.is_unlimited = hasUnlimited;
  }

  return estimate;
}

function calculateChecksInWindow(startTime: string, endTime: string, intervalMinutes: number): number {
  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());
  
  let durationMinutes = (end.getTime() - start.getTime()) / 60000;
  
  // Handle overnight windows
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60; // Add 24 hours
  }

  return Math.floor(durationMinutes / intervalMinutes);
}

export function shouldStopChecking(
  monitor: MonitoredEmail,
  hasResponded: boolean
): boolean {
  if (!hasResponded) {
    return false;
  }

  return monitor.stop_after_response !== 'never';
}

export function getIntervalForMonitor(monitor: MonitoredEmail): number {
  if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
    return monitor.recurring_config.interval_minutes;
  }

  if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
    return monitor.specific_dates_config.interval_minutes;
  }

  if (monitor.schedule_type === 'hybrid') {
    // Return the smaller interval to ensure we don't miss checks
    const recurringInterval = monitor.recurring_config?.interval_minutes || 60;
    const specificInterval = monitor.specific_dates_config?.interval_minutes || 60;
    return Math.min(recurringInterval, specificInterval);
  }

  return 5; // Default 5 minutes
}

export function validateScheduleConfig(monitor: MonitoredEmail): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (monitor.schedule_type === 'recurring' || monitor.schedule_type === 'hybrid') {
    if (!monitor.recurring_config) {
      errors.push('Recurring configuration is required for recurring schedule');
    } else {
      if (!monitor.recurring_config.days || monitor.recurring_config.days.length === 0) {
        errors.push('At least one day must be selected for recurring schedule');
      }
      if (monitor.recurring_config.max_checks_per_day !== undefined && monitor.recurring_config.max_checks_per_day < 1) {
        errors.push('Maximum checks per day must be at least 1');
      }
      if (monitor.recurring_config.interval_minutes < 1) {
        errors.push('Check interval must be at least 1 minute');
      }
      // Validate time window
      if (monitor.recurring_config.start_time && monitor.recurring_config.end_time) {
        const startTime = parse(monitor.recurring_config.start_time, 'HH:mm', new Date());
        const endTime = parse(monitor.recurring_config.end_time, 'HH:mm', new Date());
        if (endTime < startTime) {
          errors.push('End time must be after start time or schedule spans midnight (invalid time window)');
        }
      }
    }
  }

  if (monitor.schedule_type === 'specific_dates' || monitor.schedule_type === 'hybrid') {
    if (!monitor.specific_dates_config) {
      errors.push('Specific dates configuration is required');
    } else {
      if (!monitor.specific_dates_config.dates || monitor.specific_dates_config.dates.length === 0) {
        errors.push('At least one date must be selected');
      }
      if (monitor.specific_dates_config.max_checks_per_date !== undefined && monitor.specific_dates_config.max_checks_per_date < 1) {
        errors.push('Maximum checks per date must be at least 1');
      }
      if (monitor.specific_dates_config.interval_minutes < 1) {
        errors.push('Check interval must be at least 1 minute');
      }
      // Validate time window
      if (monitor.specific_dates_config.start_time && monitor.specific_dates_config.end_time) {
        const startTime = parse(monitor.specific_dates_config.start_time, 'HH:mm', new Date());
        const endTime = parse(monitor.specific_dates_config.end_time, 'HH:mm', new Date());
        if (endTime < startTime) {
          errors.push('End time must be after start time or schedule spans midnight (invalid time window)');
        }
      }
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(monitor.sender_email)) {
    errors.push('Invalid sender email format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
