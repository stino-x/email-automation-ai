-- Migration: Add Calendar Configuration Support
-- Run this in your Supabase SQL Editor

-- Add calendar_id to configurations table
ALTER TABLE configurations 
ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';

-- Add comment
COMMENT ON COLUMN configurations.calendar_id IS 'Google Calendar ID to use for email responses (default: primary)';

SELECT 'Calendar Configuration migration completed!' as status;
