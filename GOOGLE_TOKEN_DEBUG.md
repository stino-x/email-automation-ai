# Google OAuth Token Debugging Guide

## What I've Added

### 1. New Token Status Check Button
- Location: Settings page → "Testing & Debugging" section
- Button: "Check Google Token Status"
- This will show you if tokens are stored in the database

### 2. New API Endpoint
- Path: `/api/auth/google/status`
- Returns detailed token information without exposing sensitive data
- Shows:
  - Whether tokens exist in database
  - Token scopes
  - Expiration date
  - When tokens were created/updated

### 3. Enhanced Logging
Added console.log statements in:
- `app/api/auth/google/callback/route.ts` - Logs OAuth flow steps
- `lib/supabase/queries.ts` - Logs database save operations

## How to Test Your Connection

### Step 1: Check Current Status
1. Go to Settings page
2. Click "Check Google Token Status"
3. Look at the toast notification:
   - ✅ **Success**: Shows scopes and expiration date → Tokens ARE stored
   - ❌ **Error**: "No Google tokens found" → Tokens NOT stored

### Step 2: Try Connecting Again
1. Click "Connect Google Account" 
2. Complete OAuth flow
3. Watch your terminal/console for logs:

```
=== Google OAuth Callback ===
Code received: true
User ID: <your-user-id>
Exchanging code for tokens...
Tokens received: { has_access_token: true, has_refresh_token: true, ... }
User email verified
Saving tokens to database for user: <your-user-id>
saveGoogleTokens called for user: <your-user-id>
Existing tokens found: true/false
Updating existing tokens... OR Inserting new tokens...
Tokens updated/inserted successfully
```

### Step 3: Verify Database Directly
Go to your Supabase dashboard and check the `google_tokens` table:
```sql
SELECT 
  user_id, 
  created_at, 
  updated_at, 
  expires_at, 
  scopes,
  CASE WHEN access_token IS NOT NULL THEN 'present' ELSE 'missing' END as access_token_status,
  CASE WHEN refresh_token IS NOT NULL THEN 'present' ELSE 'missing' END as refresh_token_status
FROM google_tokens
WHERE user_id = '<your-user-id>';
```

## Common Issues & Solutions

### Issue 1: Tokens Not Saving
**Symptoms**: "No Google tokens found" after connecting

**Possible Causes**:
1. **RLS (Row Level Security) policies blocking the insert**
   - Check if your Supabase RLS policies allow inserts
   - Look for errors in terminal logs

2. **Wrong user_id being passed**
   - Check the logs for "User ID: <value>"
   - Verify this matches your actual user ID in the database

3. **Database connection issue**
   - Check Settings → System Status → Database status
   - Verify Supabase environment variables are correct

**Solution**:
```sql
-- Temporarily disable RLS for testing
ALTER TABLE google_tokens DISABLE ROW LEVEL SECURITY;
-- Try connecting again
-- Then re-enable: ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
```

### Issue 2: Tokens Saved But Not Detected
**Symptoms**: Database shows tokens, but Settings page shows "Not Connected"

**Possible Causes**:
1. Token validation failing
2. Wrong user_id being queried

**Solution**:
- Check console logs in `/api/status` endpoint
- Verify the user_id being passed in headers

### Issue 3: OAuth Callback Fails
**Symptoms**: Redirected back with `google_connected=false`

**Check**:
1. Terminal logs for error messages
2. Google Cloud Console credentials:
   - Client ID matches .env
   - Client Secret matches .env
   - Redirect URI is exactly: `http://localhost:3000/api/auth/google/callback`

## Environment Variables Checklist

Make sure these are set in your `.env.local`:
```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Next Steps for You

1. **Click "Check Google Token Status"** - This is the fastest way to see if tokens are stored
2. **Check your terminal** - Look for the detailed logs when you connect
3. **Verify your user ID** - Make sure it's consistent
4. **Check Supabase RLS policies** - They might be blocking the insert

## If Still Not Working

Share with me:
1. What the "Check Google Token Status" button shows
2. The console logs from your terminal during OAuth
3. Any errors from the browser console (F12 → Console tab)
4. Screenshot of your Supabase `google_tokens` table (with sensitive data redacted)
