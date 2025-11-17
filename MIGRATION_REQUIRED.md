# Database Migration Required

To fix the calendar ID persistence and enable multiple Google accounts, you have several options:

## 🚀 **OPTION 1: Automated Fix (Recommended)**

### Windows Users:
Simply double-click: **`fix-database.bat`**

### Or run in terminal:
```bash
node migrate-database.js
```

### Or PowerShell:
```powershell
.\simple-fix.ps1
```

The scripts will automatically:
- Check your current database state
- Apply only the needed migrations
- Verify everything works correctly
- Show you exactly what was fixed

---

## 📋 **OPTION 2: Manual Migration**

If the automated scripts don't work, run these in your Supabase SQL Editor:

### 1. Enable Multiple Google Accounts
Run the migration from: `database/enable-multiple-google-accounts.sql`

### 2. Add Calendar Configuration Support  
Run the migration from: `database/add-calendar-configuration.sql`

### Manual Steps:
1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Copy and paste the contents of each migration file
4. Execute the SQL

---

## 🔧 **What Gets Fixed:**

## After Running Migrations:
The following issues will be resolved:
- ✅ Calendar ID will persist properly when saved in configuration
- ✅ Multiple Google accounts can be connected per user
- ✅ Connected accounts will show actual email addresses instead of "Primary Account"
- ✅ New Google account connections will appear immediately after authentication

## Code Changes Made:
I've already implemented the following fixes in your codebase:

1. **Fixed calendar ID persistence**: Updated the `saveConfiguration` function to properly save the `calendar_id` field
2. **Fixed configuration loading**: Modified the config loading logic to load calendar settings even when no monitored emails exist
3. **Improved email display**: Updated the connected accounts display to show actual email addresses
4. **Added redirect handling**: Added proper handling for Google auth redirects with success/error messages
5. **Enhanced multi-account support**: Added individual account disconnect functionality

Once you run the database migrations, all these features will work correctly.