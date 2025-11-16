-- Migration: Fix Multi-Account Support - Remove UNIQUE Constraint
-- Purpose: Allow users to connect multiple Google accounts for different email monitors
-- Issue: google_tokens table has UNIQUE constraint on user_id preventing multiple accounts
-- Date: 2025-11-15

-- Step 1: Remove UNIQUE constraint on user_id
DO $$ 
BEGIN
    ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
    RAISE NOTICE 'Successfully removed UNIQUE constraint on user_id';
EXCEPTION
    WHEN undefined_object THEN 
        RAISE NOTICE 'Constraint does not exist, skipping removal';
END $$;

-- Step 2: Add new columns for multi-account support (if not exists)
ALTER TABLE google_tokens 
ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT 'Primary Account',
ADD COLUMN IF NOT EXISTS google_email TEXT;

-- Step 3: Create partial unique index to prevent duplicate accounts
-- This allows NULL google_email but prevents duplicates when google_email is set
DROP INDEX IF EXISTS idx_unique_user_google_email;
CREATE UNIQUE INDEX idx_unique_user_google_email 
ON google_tokens(user_id, google_email) 
WHERE google_email IS NOT NULL;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_email 
ON google_tokens(user_id, google_email);

-- Step 5: Verify the changes
DO $$
DECLARE
    constraint_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Check if UNIQUE constraint is removed
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conrelid = 'google_tokens'::regclass
      AND contype = 'u'
      AND conname = 'google_tokens_user_id_key';
    
    IF constraint_count = 0 THEN
        RAISE NOTICE '✓ UNIQUE constraint successfully removed';
    ELSE
        RAISE WARNING '✗ UNIQUE constraint still exists!';
    END IF;
    
    -- Check if new index exists
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'google_tokens'
      AND indexname = 'idx_unique_user_google_email';
    
    IF index_count = 1 THEN
        RAISE NOTICE '✓ Multi-account index successfully created';
    ELSE
        RAISE WARNING '✗ Multi-account index not found!';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'You can now connect multiple Google accounts per user.';
    RAISE NOTICE '========================================';
END $$;

-- Display current google_tokens structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'google_tokens'
ORDER BY ordinal_position;
