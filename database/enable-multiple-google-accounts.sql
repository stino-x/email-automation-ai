-- Migration: Enable Multiple Google Accounts Per User
-- Allows users to connect multiple Google accounts for different email monitors

-- Step 1: Remove UNIQUE constraint on user_id (PostgreSQL syntax)
DO $$ 
BEGIN
    ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Step 2: Add new columns for multi-account support
ALTER TABLE google_tokens 
ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT 'Primary Account',
ADD COLUMN IF NOT EXISTS google_email TEXT; -- Store the Google account email for identification

-- Step 3: Create partial unique index to prevent duplicate accounts
-- This allows NULL google_email (backward compatible) but prevents duplicates when google_email is set
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_google_email 
ON google_tokens(user_id, google_email) 
WHERE google_email IS NOT NULL;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_email 
ON google_tokens(user_id, google_email);

-- Comments
COMMENT ON COLUMN google_tokens.account_label IS 'User-friendly label for the Google account (e.g., "Work Email", "Personal")';
COMMENT ON COLUMN google_tokens.google_email IS 'The Google account email address for identification';
