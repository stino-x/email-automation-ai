# Fix Multi-Account and Calendar ID Issues

## Issues Identified

### 1. **Multi-Account Not Working**
**Problem:** The `google_tokens` table has a UNIQUE constraint on `user_id`, preventing you from adding multiple Google accounts.

**Symptoms:**
- You click "Add Another Account" and authorize
- The account doesn't show up in Settings
- Only one account can be connected per user

**Root Cause:** Database schema has `user_id UUID ... NOT NULL UNIQUE` which blocks multiple accounts.

### 2. **502 Error on Config Save**
**Problem:** Railway worker is either down or timing out.

**Symptoms:**
- Editing config times causes 502 error in Railway logs
- Worker webhook calls are failing

**Root Cause:** Worker service on Railway is not responding to webhook calls.

### 3. **Calendar ID Resetting to "primary"**
**Problem:** Already fixed in code, but database might have old value cached.

**Status:** ✅ Code fix already committed - preserves calendar_id during saves.

---

## Solutions

### Solution 1: Apply Database Migration (REQUIRED)

You need to run this SQL in your Supabase SQL Editor:

```sql
-- Migration: Enable Multiple Google Accounts Per User
-- Allows users to connect multiple Google accounts for different email monitors

-- Step 1: Remove UNIQUE constraint on user_id
DO $$ 
BEGIN
    ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
EXCEPTION
    WHEN undefined_object THEN NULL;
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

-- Verify the change
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'google_tokens'::regclass;
```

**How to apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Paste the SQL above
3. Click "Run"
4. Verify you see "Success" message
5. The constraint should be removed

### Solution 2: Check Railway Worker Status

**Check if worker is running:**
1. Go to Railway dashboard
2. Check if the worker service is "Active"
3. Check deployment logs for errors
4. Look for "Worker started" messages

**If worker is down:**
- Redeploy the worker service
- Check environment variables are set correctly
- Verify `WORKER_SECRET` matches between main app and worker

**Temporary workaround:**
- The config will still save to database even if worker notification fails
- Worker will pick up changes on next check cycle (every 5 minutes)

### Solution 3: Verify Calendar ID Fix

The code fix is already deployed. To verify:

1. Go to Edit Config
2. Change calendar_id to your custom ID
3. Click "Save Configuration"
4. Refresh the page
5. Calendar ID should remain your custom value (not "primary")

**If still resetting:**
- Check browser console for errors during save
- Verify the save API response includes your calendar_id

---

## Testing After Migration

### Test Multi-Account Support:

1. **Apply the SQL migration above**
2. **Go to Settings page**
3. **Click "Add Another Account"**
4. **Authorize `iheagwarqaustin214@gmail.com`**
5. **You should see BOTH accounts listed:**
   - `austindev214@gmail.com` (Primary)
   - `iheagwarqaustin214@gmail.com` (Secondary)

### Test Email Monitoring:

1. **In Edit Config, create a monitor:**
   - Sender Email: `austindev214@gmail.com`
   - Receiving Gmail Account: `iheagwarqaustin214@gmail.com`
   - Set schedule and activate

2. **Send test email:**
   - FROM: `austindev214@gmail.com`
   - TO: `iheagwarqaustin214@gmail.com`
   - Subject: "Test multi-account"

3. **Check worker logs:**
   - Should see: "Processing 1 monitors for account: iheagwarqaustin214@gmail.com"
   - Should NOT see: "No Google tokens found"

---

## Verification Queries

Run these in Supabase SQL Editor to verify the fix:

```sql
-- Check if UNIQUE constraint is removed
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conkey as constraint_columns
FROM pg_constraint 
WHERE conrelid = 'google_tokens'::regclass
  AND contype = 'u'; -- 'u' = UNIQUE constraint

-- Should return only the index-based constraint, NOT google_tokens_user_id_key

-- Check existing google_tokens
SELECT 
    user_id,
    google_email,
    account_label,
    created_at
FROM google_tokens
ORDER BY created_at;

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'google_tokens';
```

---

## Expected Results

After applying the migration:

✅ **Multi-Account:**
- Multiple Google accounts can be connected per user
- Each account shows in Settings with email address
- Can assign different monitors to different receiving accounts

✅ **Calendar ID:**
- Saves correctly and doesn't reset to "primary"
- Persists across page reloads

✅ **Worker Communication:**
- Config saves succeed (even if worker is down)
- Worker picks up changes within 5 minutes
- No 502 errors if worker is healthy

---

## Still Having Issues?

If problems persist after migration:

1. **Clear browser cache** - Old API responses might be cached
2. **Check Supabase logs** - Look for RLS policy errors
3. **Check Railway logs** - Verify worker is receiving webhooks
4. **Verify environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `WORKER_WEBHOOK_URL`
   - `WORKER_SECRET`
