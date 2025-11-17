# Email Automation AI - Database Fix Script
# This script automatically applies the required database migrations

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseAnonKey,
    
    [Parameter(Mandatory=$false)]
    [string]$SupabaseServiceRoleKey = ""
)

Write-Host "🔧 Email Automation AI - Database Fix Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if required parameters are provided
if (-not $SupabaseUrl -or -not $SupabaseAnonKey) {
    Write-Host "❌ Error: Missing required parameters" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\fix-database.ps1 -SupabaseUrl 'https://your-project.supabase.co' -SupabaseAnonKey 'your-anon-key'"
    Write-Host ""
    Write-Host "Optional parameters:" -ForegroundColor Yellow
    Write-Host "  -SupabaseServiceRoleKey 'your-service-role-key'  # For better permissions"
    Write-Host ""
    Write-Host "You can find these values in your Supabase project settings:" -ForegroundColor Gray
    Write-Host "  1. Go to your Supabase project dashboard"
    Write-Host "  2. Navigate to Settings > API"
    Write-Host "  3. Copy the Project URL and anon public key"
    exit 1
}

# Function to execute SQL against Supabase
function Invoke-SupabaseSQL {
    param(
        [string]$Sql,
        [string]$Description
    )
    
    Write-Host "⚡ $Description..." -ForegroundColor Yellow
    
    # Use service role key if provided, otherwise use anon key
    $apiKey = if ($SupabaseServiceRoleKey) { $SupabaseServiceRoleKey } else { $SupabaseAnonKey }
    
    $headers = @{
        "apikey" = $apiKey
        "Authorization" = "Bearer $apiKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=minimal"
    }
    
    $body = @{
        query = $Sql
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/execute_sql" -Method Post -Headers $headers -Body $body
        Write-Host "✅ $Description completed successfully" -ForegroundColor Green
        return $true
    }
    catch {
        # Try alternative method with direct SQL execution
        try {
            $sqlEndpoint = "$SupabaseUrl/rest/v1/"
            $response = Invoke-RestMethod -Uri $sqlEndpoint -Method Post -Headers $headers -Body $body
            Write-Host "✅ $Description completed successfully" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "❌ Failed to execute: $Description" -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

# Function to check if migration is needed
function Test-MigrationNeeded {
    param([string]$TestQuery, [string]$TestName)
    
    Write-Host "🔍 Checking if $TestName migration is needed..." -ForegroundColor Cyan
    
    $apiKey = if ($SupabaseServiceRoleKey) { $SupabaseServiceRoleKey } else { $SupabaseAnonKey }
    
    $headers = @{
        "apikey" = $apiKey
        "Authorization" = "Bearer $apiKey"
        "Accept" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/$TestQuery" -Method Get -Headers $headers
        Write-Host "✅ $TestName: Already applied" -ForegroundColor Green
        return $false
    }
    catch {
        Write-Host "⚠️  $TestName: Migration needed" -ForegroundColor Yellow
        return $true
    }
}

Write-Host ""
Write-Host "📋 Step 1: Checking current database state..."
Write-Host ""

# Check if multiple Google accounts migration is needed
$needsGoogleMigration = Test-MigrationNeeded "google_tokens?select=google_email&limit=1" "Multiple Google Accounts"

# Check if calendar configuration migration is needed
$needsCalendarMigration = Test-MigrationNeeded "configurations?select=calendar_id&limit=1" "Calendar Configuration"

if (-not $needsGoogleMigration -and -not $needsCalendarMigration) {
    Write-Host "🎉 All migrations are already applied! Your database is up to date." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "📋 Step 2: Applying required migrations..."
Write-Host ""

$allSuccess = $true

# Apply Multiple Google Accounts Migration
if ($needsGoogleMigration) {
    Write-Host "🔄 Applying Multiple Google Accounts Migration..." -ForegroundColor Blue
    
    # Step 1: Remove UNIQUE constraint
    $sql1 = @"
DO `$`$ 
BEGIN
    ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
EXCEPTION
    WHEN undefined_object THEN NULL;
END `$`$;
"@
    
    $success1 = Invoke-SupabaseSQL -Sql $sql1 -Description "Removing UNIQUE constraint on user_id"
    
    # Step 2: Add new columns
    $sql2 = @"
ALTER TABLE google_tokens 
ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT 'Primary Account',
ADD COLUMN IF NOT EXISTS google_email TEXT;
"@
    
    $success2 = Invoke-SupabaseSQL -Sql $sql2 -Description "Adding account_label and google_email columns"
    
    # Step 3: Create unique index
    $sql3 = @"
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_google_email 
ON google_tokens(user_id, google_email) 
WHERE google_email IS NOT NULL;
"@
    
    $success3 = Invoke-SupabaseSQL -Sql $sql3 -Description "Creating unique index for multi-account support"
    
    # Step 4: Create lookup index
    $sql4 = @"
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_email 
ON google_tokens(user_id, google_email);
"@
    
    $success4 = Invoke-SupabaseSQL -Sql $sql4 -Description "Creating lookup index"
    
    if ($success1 -and $success2 -and $success3 -and $success4) {
        Write-Host "✅ Multiple Google Accounts migration completed successfully!" -ForegroundColor Green
    } else {
        $allSuccess = $false
        Write-Host "❌ Multiple Google Accounts migration failed!" -ForegroundColor Red
    }
}

# Apply Calendar Configuration Migration
if ($needsCalendarMigration) {
    Write-Host "🔄 Applying Calendar Configuration Migration..." -ForegroundColor Blue
    
    $sql5 = @"
ALTER TABLE configurations 
ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';
"@
    
    $success5 = Invoke-SupabaseSQL -Sql $sql5 -Description "Adding calendar_id column to configurations"
    
    if ($success5) {
        Write-Host "✅ Calendar Configuration migration completed successfully!" -ForegroundColor Green
    } else {
        $allSuccess = $false
        Write-Host "❌ Calendar Configuration migration failed!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📋 Step 3: Verification..."
Write-Host ""

# Verify migrations
Start-Sleep -Seconds 2

$googleVerified = -not (Test-MigrationNeeded "google_tokens?select=google_email&limit=1" "Multiple Google Accounts (verification)")
$calendarVerified = -not (Test-MigrationNeeded "configurations?select=calendar_id&limit=1" "Calendar Configuration (verification)")

Write-Host ""
if ($allSuccess -and $googleVerified -and $calendarVerified) {
    Write-Host "🎉 SUCCESS! All database fixes have been applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Fixed Issues:" -ForegroundColor Green
    Write-Host "  • Calendar ID will now persist when saved"
    Write-Host "  • Multiple Google accounts are now supported"
    Write-Host "  • Connected emails will show actual email addresses"
    Write-Host "  • New Google connections will appear immediately"
    Write-Host ""
    Write-Host "🚀 You can now:" -ForegroundColor Cyan
    Write-Host "  • Save calendar configurations and they'll persist"
    Write-Host "  • Connect multiple Google accounts"
    Write-Host "  • See actual email addresses instead of 'Primary'"
    Write-Host "  • Add new email accounts without issues"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Refresh your application"
    Write-Host "  2. Test the configuration page"
    Write-Host "  3. Try connecting additional Google accounts"
} else {
    Write-Host "❌ FAILED! Some migrations could not be applied." -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual steps required:" -ForegroundColor Yellow
    Write-Host "  1. Go to your Supabase project dashboard"
    Write-Host "  2. Navigate to 'SQL Editor'"
    Write-Host "  3. Run the SQL files manually:"
    Write-Host "     - database/enable-multiple-google-accounts.sql"
    Write-Host "     - database/add-calendar-configuration.sql"
    Write-Host ""
    Write-Host "Or try running this script with your Service Role Key:" -ForegroundColor Yellow
    Write-Host "  .\fix-database.ps1 -SupabaseUrl '$SupabaseUrl' -SupabaseAnonKey '$SupabaseAnonKey' -SupabaseServiceRoleKey 'your-service-role-key'"
}

Write-Host ""
Write-Host "Script completed." -ForegroundColor Gray