-- Add calendar configuration support
-- This allows users to specify which Google Calendar to monitor for each service

-- Add calendar_id to configurations (for email monitoring)
ALTER TABLE configurations 
ADD COLUMN calendar_id TEXT DEFAULT 'primary';

-- Add calendar_id to facebook_configurations (for Facebook monitoring)
ALTER TABLE facebook_configurations 
ADD COLUMN calendar_id TEXT DEFAULT 'primary';

-- Add comments
COMMENT ON COLUMN configurations.calendar_id IS 'Google Calendar ID to use for email responses (default: primary)';
COMMENT ON COLUMN facebook_configurations.calendar_id IS 'Google Calendar ID to use for Facebook responses (default: primary)';

-- Example calendar IDs:
-- 'primary' - Your main Google Calendar
-- 'your-email@gmail.com' - Specific calendar
-- 'abc123@group.calendar.google.com' - Shared calendar ID
