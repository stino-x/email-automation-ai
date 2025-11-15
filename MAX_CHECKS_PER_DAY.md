# Max Checks Per Day Documentation

## Overview
The **Max Checks Per Day** feature controls how many times the system will check for new emails from a specific sender within a 24-hour period. This prevents excessive API calls and helps manage your Gmail API quota limits.

## How It Works

### Basic Concept
When you configure an email monitor with a recurring schedule, you specify:
- **Check Every (minutes)**: How often to check for emails (e.g., every 15 minutes)
- **Start Time**: When to start checking each day (e.g., 09:00)
- **End Time**: When to stop checking each day (e.g., 17:00)
- **Max Checks Per Day**: Maximum number of checks allowed in 24 hours

### Calculation Example

#### Without Max Checks Limit
If you set:
- Start Time: 09:00
- End Time: 17:00 (8-hour window)
- Check Every: 15 minutes

The system would check: **8 hours × 4 checks/hour = 32 checks per day**

#### With Max Checks Limit
If you set **Max Checks Per Day = 20**, the system will:
1. Distribute 20 checks evenly across your 8-hour window
2. Check approximately every 24 minutes (8 hours ÷ 20 checks)
3. Stop after 20 checks, even if the end time hasn't been reached

### Priority Scheduling
The system uses the **more restrictive** value between:
- Checks based on interval
- Max checks per day limit

Example:
- Interval would give 32 checks
- Max checks per day set to 20
- **Result: 20 checks** (the lower, more restrictive value)

## Different Schedule Types

### 1. Recurring Schedule
- **Field Name**: `max_checks_per_day`
- **Scope**: Per calendar day (midnight to midnight)
- **Resets**: Automatically at midnight

```typescript
recurring_config: {
  days: ['monday', 'tuesday', 'wednesday'],
  start_time: '09:00',
  end_time: '17:00',
  interval_minutes: 15,
  max_checks_per_day: 30  // Maximum 30 checks per day
}
```

### 2. Specific Dates Schedule
- **Field Name**: `max_checks_per_date`
- **Scope**: Per individual selected date
- **Resets**: Each date is independent

```typescript
specific_dates_config: {
  dates: ['2025-11-20', '2025-11-25'],
  start_time: '10:00',
  end_time: '16:00',
  interval_minutes: 10,
  max_checks_per_date: 25  // Maximum 25 checks on each selected date
}
```

### 3. Hybrid Schedule
Uses **both** limits:
- `recurring_config.max_checks_per_day` for recurring days
- `specific_dates_config.max_checks_per_date` for specific dates

```typescript
// On recurring days (e.g., Monday): max 30 checks
// On specific dates (e.g., 2025-11-25): max 40 checks
```

## Practical Usage Examples

### Example 1: Standard Business Hours
```
Start Time: 09:00
End Time: 17:00
Check Every: 15 minutes
Max Checks Per Day: 30
```
**Result**: Checks 30 times between 9am-5pm, roughly every 16 minutes

### Example 2: Frequent Monitoring
```
Start Time: 08:00
End Time: 20:00
Check Every: 5 minutes
Max Checks Per Day: 50
```
**Result**: Without limit = 144 checks (12 hours × 12 checks/hour)
With limit = 50 checks, distributed across 12 hours (~14.4 minutes apart)

### Example 3: Conservative Monitoring
```
Start Time: 09:00
End Time: 17:00
Check Every: 30 minutes
Max Checks Per Day: 10
```
**Result**: Only 10 checks throughout the day, roughly every 48 minutes

## Why Use Max Checks Per Day?

### 1. **API Quota Management**
Gmail API has daily quotas. Limiting checks prevents exceeding these limits.

### 2. **Cost Control**
If running on cloud platforms, fewer API calls = lower costs.

### 3. **Respectful Monitoring**
Prevents hammering the Gmail API unnecessarily, especially if you don't need real-time responses.

### 4. **Battery/Resource Saving**
For systems running continuously, fewer checks = less resource usage.

## Default Values
- **Recurring Schedule**: Default is `30` checks per day
- **Specific Dates**: Default is `30` checks per date
- **Minimum**: `0` (disables checking)
- **Maximum**: No hard limit, but recommended to stay under 100 for API quota safety

## Interaction with Other Settings

### Stop After Response
When an email is found and responded to, the "Stop After Response" setting determines when checking resumes:
- **Never**: Continues checking up to max_checks_per_day
- **Rest of Day**: Stops all checks until midnight (max_checks_per_day effectively doesn't matter)
- **Rest of Window**: Stops until next time window
- **Next Period**: Waits until next scheduled check period

### Check Interval
The `interval_minutes` works together with `max_checks_per_day`:
```
Actual Interval = MAX(
  interval_minutes,
  (end_time - start_time) / max_checks_per_day
)
```

## Monitoring Your Usage

The system tracks:
- Total checks performed today
- Checks remaining for today
- Last check timestamp
- Next scheduled check time

You can view this in the Activity Log section of the dashboard.

## Troubleshooting

### "Not checking as frequently as expected"
- Check if max_checks_per_day is limiting your interval
- Calculate: (end_time - start_time) / max_checks_per_day
- If result > interval_minutes, increase max_checks_per_day

### "Exceeding API limits"
- Reduce max_checks_per_day to 20-30 per sender
- Increase interval_minutes to 10-15 minutes
- Consider if you really need real-time monitoring

### "Checks stopping mid-day"
- Verify max_checks_per_day isn't too low
- Check "Stop After Response" setting
- Review Activity Log for errors

## Best Practices

1. **Start Conservative**: Begin with 20-30 checks per day and adjust based on needs
2. **Match Your Urgency**: High-priority senders = higher max checks
3. **Consider Time Windows**: Shorter windows need higher check counts for frequent monitoring
4. **Monitor Your Quota**: Keep track of total Gmail API usage across all monitors
5. **Test First**: Use test mode to verify your settings work as expected

## Technical Implementation

The worker service uses this logic:

```typescript
const checksPerDay = monitor.recurring_config.max_checks_per_day;
const windowDuration = calculateDuration(start_time, end_time);
const effectiveInterval = Math.max(
  monitor.recurring_config.interval_minutes,
  windowDuration / checksPerDay
);

if (checkCount >= checksPerDay) {
  // Skip this check, limit reached
  return;
}

// Perform check
performEmailCheck();
checkCount++;
```

## Related Configuration Fields
- `interval_minutes`: Base check frequency
- `start_time` / `end_time`: Active monitoring window
- `stop_after_response`: When to stop checking after finding/responding to email
- `is_active`: Master toggle for this monitor
