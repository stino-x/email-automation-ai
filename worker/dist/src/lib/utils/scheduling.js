"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInSchedule = isInSchedule;
exports.getNextCheckTime = getNextCheckTime;
exports.getMaxChecksForPeriod = getMaxChecksForPeriod;
exports.generateMonitorIdentifier = generateMonitorIdentifier;
exports.generatePeriodIdentifier = generatePeriodIdentifier;
exports.generateWindowIdentifier = generateWindowIdentifier;
exports.estimateSchedule = estimateSchedule;
exports.shouldStopChecking = shouldStopChecking;
exports.getIntervalForMonitor = getIntervalForMonitor;
exports.validateScheduleConfig = validateScheduleConfig;
const date_fns_1 = require("date-fns");
const crypto_1 = require("crypto");
function isInSchedule(monitor) {
    const now = new Date();
    const currentTime = (0, date_fns_1.format)(now, 'HH:mm');
    const currentDay = (0, date_fns_1.format)(now, 'EEEE').toLowerCase();
    const currentDate = (0, date_fns_1.format)(now, 'yyyy-MM-dd');
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
function isInRecurringSchedule(currentDay, currentTime, config) {
    // Check if current day is in the schedule
    if (!config.days.includes(currentDay)) {
        return false;
    }
    // Check if current time is within the time window
    return isTimeInWindow(currentTime, config.start_time, config.end_time);
}
function isInSpecificDatesSchedule(currentDate, currentTime, config) {
    // Check if current date is in the list
    if (!config.dates.includes(currentDate)) {
        return false;
    }
    // Check if current time is within the time window
    return isTimeInWindow(currentTime, config.start_time, config.end_time);
}
function isTimeInWindow(currentTime, startTime, endTime) {
    const current = (0, date_fns_1.parse)(currentTime, 'HH:mm', new Date());
    const start = (0, date_fns_1.parse)(startTime, 'HH:mm', new Date());
    const end = (0, date_fns_1.parse)(endTime, 'HH:mm', new Date());
    // Handle case where end time is before start time (crosses midnight)
    if (end < start) {
        return current >= start || current <= end;
    }
    return current >= start && current <= end;
}
function getNextCheckTime(monitor) {
    const now = new Date();
    let intervalMinutes = 5; // Default
    if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
        intervalMinutes = monitor.recurring_config.interval_minutes;
    }
    else if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
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
function getMaxChecksForPeriod(monitor, periodIdentifier) {
    // Period identifier format: "YYYY-MM-DD" or "YYYY-WXX-dayname"
    if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
        return monitor.recurring_config.max_checks_per_day;
    }
    if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
        return monitor.specific_dates_config.max_checks_per_date;
    }
    if (monitor.schedule_type === 'hybrid') {
        // Check if periodIdentifier matches a specific date
        if (monitor.specific_dates_config?.dates.includes(periodIdentifier)) {
            return monitor.specific_dates_config.max_checks_per_date;
        }
        // Otherwise use recurring max
        return monitor.recurring_config?.max_checks_per_day || 100;
    }
    return 100; // Default
}
function generateMonitorIdentifier(senderEmail, schedule) {
    const data = JSON.stringify({
        sender: senderEmail,
        type: schedule.schedule_type,
        recurring: schedule.recurring_config,
        specific: schedule.specific_dates_config
    });
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex').substring(0, 16);
}
function generatePeriodIdentifier(date = new Date()) {
    return (0, date_fns_1.format)(date, 'yyyy-MM-dd');
}
function generateWindowIdentifier(monitor, date = new Date()) {
    if (monitor.schedule_type === 'specific_dates') {
        return (0, date_fns_1.format)(date, 'yyyy-MM-dd');
    }
    // For recurring and hybrid, use week + day format
    const weekNumber = (0, date_fns_1.format)(date, 'II'); // ISO week number
    const dayName = (0, date_fns_1.format)(date, 'EEEE').toLowerCase();
    return `${(0, date_fns_1.format)(date, 'yyyy')}-W${weekNumber}-${dayName}`;
}
function estimateSchedule(monitor) {
    const estimate = {};
    if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
        const config = monitor.recurring_config;
        const checksPerDay = calculateChecksInWindow(config.start_time, config.end_time, config.interval_minutes);
        estimate.checks_per_day = Math.min(checksPerDay, config.max_checks_per_day);
        estimate.checks_per_week = estimate.checks_per_day * config.days.length;
    }
    if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
        const config = monitor.specific_dates_config;
        const checksPerDate = calculateChecksInWindow(config.start_time, config.end_time, config.interval_minutes);
        const maxPerDate = Math.min(checksPerDate, config.max_checks_per_date);
        estimate.total_checks = maxPerDate * config.dates.length;
    }
    if (monitor.schedule_type === 'hybrid') {
        let totalChecks = 0;
        if (monitor.recurring_config) {
            const config = monitor.recurring_config;
            const checksPerDay = calculateChecksInWindow(config.start_time, config.end_time, config.interval_minutes);
            estimate.checks_per_day = Math.min(checksPerDay, config.max_checks_per_day);
            estimate.checks_per_week = estimate.checks_per_day * config.days.length;
            totalChecks += estimate.checks_per_week;
        }
        if (monitor.specific_dates_config) {
            const config = monitor.specific_dates_config;
            const checksPerDate = calculateChecksInWindow(config.start_time, config.end_time, config.interval_minutes);
            const maxPerDate = Math.min(checksPerDate, config.max_checks_per_date);
            totalChecks += maxPerDate * config.dates.length;
        }
        estimate.total_checks = totalChecks;
    }
    return estimate;
}
function calculateChecksInWindow(startTime, endTime, intervalMinutes) {
    const start = (0, date_fns_1.parse)(startTime, 'HH:mm', new Date());
    const end = (0, date_fns_1.parse)(endTime, 'HH:mm', new Date());
    let durationMinutes = (end.getTime() - start.getTime()) / 60000;
    // Handle overnight windows
    if (durationMinutes < 0) {
        durationMinutes += 24 * 60; // Add 24 hours
    }
    return Math.floor(durationMinutes / intervalMinutes);
}
function shouldStopChecking(monitor, hasResponded) {
    if (!hasResponded) {
        return false;
    }
    return monitor.stop_after_response !== 'never';
}
function getIntervalForMonitor(monitor) {
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
function validateScheduleConfig(monitor) {
    const errors = [];
    if (monitor.schedule_type === 'recurring' || monitor.schedule_type === 'hybrid') {
        if (!monitor.recurring_config) {
            errors.push('Recurring configuration is required for recurring schedule');
        }
        else {
            if (!monitor.recurring_config.days || monitor.recurring_config.days.length === 0) {
                errors.push('At least one day must be selected for recurring schedule');
            }
            if (monitor.recurring_config.max_checks_per_day < 1) {
                errors.push('Maximum checks per day must be at least 1');
            }
            if (monitor.recurring_config.interval_minutes < 1) {
                errors.push('Check interval must be at least 1 minute');
            }
        }
    }
    if (monitor.schedule_type === 'specific_dates' || monitor.schedule_type === 'hybrid') {
        if (!monitor.specific_dates_config) {
            errors.push('Specific dates configuration is required');
        }
        else {
            if (!monitor.specific_dates_config.dates || monitor.specific_dates_config.dates.length === 0) {
                errors.push('At least one date must be selected');
            }
            if (monitor.specific_dates_config.max_checks_per_date < 1) {
                errors.push('Maximum checks per date must be at least 1');
            }
            if (monitor.specific_dates_config.interval_minutes < 1) {
                errors.push('Check interval must be at least 1 minute');
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
