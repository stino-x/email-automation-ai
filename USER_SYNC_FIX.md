# Fix for "User Not Found" Issue

## Problem Identified
You were logged in to Supabase Auth, but your user record wasn't in the custom `users` table. This is because:
1. You signed up BEFORE creating the database tables
2. The auth flow only creates records in Supabase's `auth.users` table
3. Your app needs a matching record in the custom `users` table

## Solution Implemented

### 1. Auto-Sync on Login ✅
Modified `lib/auth.ts` to automatically create a user record in the custom `users` table whenever you:
- Sign up (creates record immediately)
- Log in (checks if record exists, creates if missing)

### 2. Manual Sync Button ✅
Added a **"Sync User to Database"** button in Settings page that:
- Takes your authenticated Supabase Auth user
- Creates the matching record in the custom `users` table
- Shows success message with your user ID

### 3. New API Endpoint
Created `/api/auth/sync-user` that:
- Gets your authenticated user from Supabase Auth
- Checks if you exist in the custom `users` table
- Creates the record if missing

## What Happens to Existing Users?

### ✅ You (Currently Logged In)
**Click the "Sync User to Database" button** - One-time fix, takes 2 seconds

### ✅ Other Existing Users
**Automatic on next login** - When they log in again, the code automatically creates their record

### ✅ Future Users
**Always automatic** - Both records are created on signup, stays in sync forever

## How to Fix Your Current Issue

### Option 1: Click the Button (Easiest)
1. Go to Settings page
2. Click **"Sync User to Database"** (green button at top)
3. You should see: "User synced to database successfully"
4. Now try connecting Google again

### Option 2: Log Out and Log Back In
1. Log out of your account
2. Log back in with the same credentials
3. The login will automatically create your user record
4. Then try connecting Google

### Option 3: Bulk Sync All Users (Admin Only)
If you have multiple existing users, run the SQL script:
1. Open Supabase SQL Editor
2. Run the script in `database/migrate-existing-users.sql`
3. It syncs ALL auth users to the custom table at once

### Option 4: API Bulk Sync (Advanced)
Use the admin endpoint to sync all users programmatically:
```bash
curl -X POST http://localhost:3000/api/admin/sync-all-users \
  -H "x-admin-secret: your-admin-secret"
```
(Requires `ADMIN_SECRET` in your .env file)

## What Happens Next

After syncing your user:
1. ✅ "Show Full Debug Info" will show "User: ✓ Found"
2. ✅ Google OAuth will be able to save tokens
3. ✅ You can configure email monitoring
4. ✅ All features will work properly

## Why This Happened

Your app uses TWO user systems:
1. **Supabase Auth** (`auth.users` table) - For authentication/login
2. **Custom Users Table** (`users` table) - For app-specific data

The tables were created AFTER you signed up, so your auth user exists but your app user doesn't. The fix ensures they're always in sync.

## Prevention

The updated code now ensures this won't happen again:
- New signups automatically create both records
- Logins check and create the custom record if missing
- You can manually sync anytime using the button
