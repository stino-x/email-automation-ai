-- Combined Migration: Fix Calendar ID Persistence & Enable Multiple Google Accounts
-- Run this entire script in your Supabase SQL Editor

BEGIN;

-- Part 1: Enable Multiple Google Accounts
DO $$ 
BEGIN
    ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE google_tokens 
ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT 'Primary Account',
ADD COLUMN IF NOT EXISTS google_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_google_email 
ON google_tokens(user_id, google_email) 
WHERE google_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_google_tokens_user_email 
ON google_tokens(user_id, google_email);

-- Part 2: Add Calendar Configuration
ALTER TABLE configurations 
ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';

-- Add comments
COMMENT ON COLUMN google_tokens.account_label IS 'User-friendly label for the Google account';
COMMENT ON COLUMN google_tokens.google_email IS 'The Google account email address for identification';
COMMENT ON COLUMN configurations.calendar_id IS 'Google Calendar ID to use for email responses (default: primary)';

COMMIT;

SELECT 'All migrations completed successfully!' as status;
