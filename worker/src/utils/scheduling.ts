import { format, parse } from 'date-fns';
import type { MonitoredEmail, ScheduleConfig } from '../types';
import { createHash } from 'crypto';

export function isInSchedule(monitor: MonitoredEmail): boolean {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  const currentDay = now.getDay(); // 0-6
  const currentDate = format(now, 'yyyy-MM-dd');

  const schedule = monitor.schedule;

  if (schedule.type === 'recurring' && schedule.days_of_week && schedule.time_window_start && schedule.time_window_end) {
    return isInRecurringSchedule(currentDay, currentTime, schedule);
  }

  if (schedule.type === 'specific_dates' && schedule.specific_dates) {
    return isInSpecificDatesSchedule(currentDate, currentTime, schedule);
  }

  if (schedule.type === 'hybrid') {
    const inRecurring = schedule.recurring_config 
      ? isInSchedule({ ...monitor, schedule: schedule.recurring_config })
      : false;
    
    const inSpecific = schedule.specific_config
      ? isInSchedule({ ...monitor, schedule: schedule.specific_config })
      : false;

    return inRecurring || inSpecific;
  }

  return false;
}

function isInRecurringSchedule(
  currentDay: number,
  currentTime: string,
  schedule: ScheduleConfig
): boolean {
  // Check if current day is in the schedule
  if (!schedule.days_of_week || !schedule.days_of_week.includes(currentDay)) {
    return false;
  }

  // Check if current time is within the time window
  if (!schedule.time_window_start || !schedule.time_window_end) {
    return false;
  }

  return isTimeInWindow(currentTime, schedule.time_window_start, schedule.time_window_end);
}

function isInSpecificDatesSchedule(
  currentDate: string,
  currentTime: string,
  schedule: ScheduleConfig
): boolean {
  if (!schedule.specific_dates) {
    return false;
  }

  // Check if current date is in the list
  const dateConfig = schedule.specific_dates.find((d: { date: string }) => d.date === currentDate);
  if (!dateConfig) {
    return false;
  }

  // Check if current time is within the time window
  return isTimeInWindow(currentTime, dateConfig.time_window_start, dateConfig.time_window_end);
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

export function getMaxChecksForPeriod(monitor: MonitoredEmail, periodIdentifier: string): number {
  const schedule = monitor.schedule;

  if (schedule.type === 'recurring') {
    return schedule.max_checks_per_day || 100;
  }

  if (schedule.type === 'specific_dates' && schedule.specific_dates) {
    const dateConfig = schedule.specific_dates.find((d: { date: string }) => d.date === periodIdentifier);
    return dateConfig?.max_checks || 100;
  }

  if (schedule.type === 'hybrid') {
    // Check if periodIdentifier matches a specific date
    if (schedule.specific_config?.specific_dates) {
      const dateConfig = schedule.specific_config.specific_dates.find((d: { date: string }) => d.date === periodIdentifier);
      if (dateConfig) {
        return dateConfig.max_checks || 100;
      }
    }
    // Otherwise use recurring max
    return schedule.recurring_config?.max_checks_per_day || 100;
  }

  return 100; // Default
}

export function generateMonitorIdentifier(emailAddress: string, schedule: ScheduleConfig): string {
  const data = JSON.stringify({
    email: emailAddress,
    type: schedule.type,
    days: schedule.days_of_week,
    dates: schedule.specific_dates?.map((d: { date: string }) => d.date)
  });
  
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function generatePeriodIdentifier(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}
