# Simple Database Fix Script for Email Automation AI
# This script applies the required database migrations using direct SQL execution

param(
    [Parameter(Mandatory=$false)]
    [string]$SupabaseUrl = "",
    
    [Parameter(Mandatory=$false)]
    [string]$SupabaseServiceKey = ""
)

Write-Host "🔧 Email Automation AI - Simple Database Fix" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

if (-not $SupabaseUrl -or -not $SupabaseServiceKey) {
    Write-Host ""
    Write-Host "⚠️  Missing Supabase credentials. This script will generate SQL files for manual execution." -ForegroundColor Yellow
    Write-Host ""
}

# Create the migration SQL files
Write-Host "📝 Creating migration SQL files..." -ForegroundColor Blue

# Create directory for migrations if it doesn't exist
$migrationDir = ".\database-fixes"
if (-not (Test-Path $migrationDir)) {
    New-Item -ItemType Directory -Path $migrationDir | Out-Null
}

# Migration 1: Multiple Google Accounts
$multiAccountSql = @"
-- Migration: Enable Multiple Google Accounts Per User
-- Run this in your Supabase SQL Editor

-- Step 1: Remove UNIQUE constraint on user_id
DO `$`$ 
BEGIN
    ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
EXCEPTION
    WHEN undefined_object THEN NULL;
END `$`$;

-- Step 2: Add new columns for multi-account support
ALTER TABLE google_tokens 
ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT 'Primary Account',
ADD COLUMN IF NOT EXISTS google_email TEXT;

-- Step 3: Create partial unique index to prevent duplicate accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_google_email 
ON google_tokens(user_id, google_email) 
WHERE google_email IS NOT NULL;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_email 
ON google_tokens(user_id, google_email);

-- Add comments
COMMENT ON COLUMN google_tokens.account_label IS 'User-friendly label for the Google account';
COMMENT ON COLUMN google_tokens.google_email IS 'The Google account email address for identification';

SELECT 'Multiple Google Accounts migration completed!' as status;
"@

# Migration 2: Calendar Configuration
$calendarSql = @"
-- Migration: Add Calendar Configuration Support
-- Run this in your Supabase SQL Editor

-- Add calendar_id to configurations table
ALTER TABLE configurations 
ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';

-- Add comment
COMMENT ON COLUMN configurations.calendar_id IS 'Google Calendar ID to use for email responses (default: primary)';

SELECT 'Calendar Configuration migration completed!' as status;
"@

# Combined migration
$combinedSql = @"
-- Combined Migration: Fix Calendar ID Persistence & Enable Multiple Google Accounts
-- Run this entire script in your Supabase SQL Editor

BEGIN;

-- Part 1: Enable Multiple Google Accounts
DO `$`$ 
BEGIN
    ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
EXCEPTION
    WHEN undefined_object THEN NULL;
END `$`$;

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
"@

# Write SQL files
$multiAccountSql | Out-File -FilePath "$migrationDir\01-multiple-google-accounts.sql" -Encoding UTF8
$calendarSql | Out-File -FilePath "$migrationDir\02-calendar-configuration.sql" -Encoding UTF8
$combinedSql | Out-File -FilePath "$migrationDir\combined-migration.sql" -Encoding UTF8

Write-Host "✅ Created migration files in: $migrationDir" -ForegroundColor Green
Write-Host ""

# If credentials provided, try to apply automatically
if ($SupabaseUrl -and $SupabaseServiceKey) {
    Write-Host "🚀 Attempting to apply migrations automatically..." -ForegroundColor Blue
    
    $headers = @{
        "apikey" = $SupabaseServiceKey
        "Authorization" = "Bearer $SupabaseServiceKey"
        "Content-Type" = "application/json"
    }
    
    try {
        # Test connection first
        $testUrl = "$SupabaseUrl/rest/v1/configurations?select=id&limit=1"
        Invoke-RestMethod -Uri $testUrl -Method Get -Headers $headers | Out-Null
        Write-Host "✅ Supabase connection successful" -ForegroundColor Green
        
        # Apply migrations using the SQL execution endpoint
        $sqlExecuteUrl = "$SupabaseUrl/rest/v1/rpc/sql"
        
        # Try to execute the combined migration
        $body = @{
            sql = $combinedSql
        } | ConvertTo-Json -Depth 10
        
        Write-Host "⚡ Executing combined migration..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri $sqlExecuteUrl -Method Post -Headers $headers -Body $body
        
        Write-Host "🎉 Migrations applied successfully!" -ForegroundColor Green
        Write-Host "✅ Your database is now fixed and ready to use!" -ForegroundColor Green
        
    } catch {
        Write-Host "⚠️  Automatic migration failed. Please apply manually." -ForegroundColor Yellow
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📋 MANUAL INSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to your Supabase project dashboard" -ForegroundColor White
Write-Host "2. Navigate to 'SQL Editor'" -ForegroundColor White
Write-Host "3. Copy and paste the content of this file:" -ForegroundColor White
Write-Host "   $migrationDir\combined-migration.sql" -ForegroundColor Yellow
Write-Host "4. Click 'Run' to execute the migration" -ForegroundColor White
Write-Host ""
Write-Host "OR run the individual migrations:" -ForegroundColor Gray
Write-Host "   • $migrationDir\01-multiple-google-accounts.sql" -ForegroundColor Gray
Write-Host "   • $migrationDir\02-calendar-configuration.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 WHAT THIS FIXES:" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host "✅ Calendar ID will persist when saved (won't revert to 'primary')" -ForegroundColor Green
Write-Host "✅ Multiple Google accounts can be connected per user" -ForegroundColor Green
Write-Host "✅ Connected emails show actual email addresses" -ForegroundColor Green
Write-Host "✅ New Google connections appear immediately" -ForegroundColor Green
Write-Host "✅ Individual accounts can be disconnected" -ForegroundColor Green
Write-Host ""
Write-Host "💡 USAGE WITH CREDENTIALS:" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
Write-Host "To run automatically with your Supabase credentials:" -ForegroundColor White
Write-Host ".\simple-fix.ps1 -SupabaseUrl 'https://your-project.supabase.co' -SupabaseServiceKey 'your-service-role-key'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Find your credentials in Supabase Dashboard > Settings > API" -ForegroundColor Gray

# Show the combined SQL content for easy copying
Write-Host ""
Write-Host "📋 COPY THIS SQL (for manual execution):" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host $combinedSql -ForegroundColor White
Write-Host "========================================" -ForegroundColor Magenta

Write-Host ""
Write-Host "Script completed. Check the '$migrationDir' folder for SQL files." -ForegroundColor Gray