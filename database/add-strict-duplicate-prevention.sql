-- STRICT RULE: Add additional unique constraint to PREVENT duplicate replies
-- This makes it DATABASE-LEVEL IMPOSSIBLE to reply to the same email twice

-- Drop existing constraint if it exists
ALTER TABLE responded_emails DROP CONSTRAINT IF EXISTS unique_email_id_user;

-- Add STRICT unique constraint on email_id + user_id
-- This ensures that for any given email, we can only respond ONCE per user
ALTER TABLE responded_emails 
ADD CONSTRAINT unique_email_id_user UNIQUE (email_id, user_id);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_responded_emails_email_user 
ON responded_emails(email_id, user_id);

-- Comment
COMMENT ON CONSTRAINT unique_email_id_user ON responded_emails IS 
'STRICT: Prevents replying to the same email more than once - database-level enforcement';
