@echo off
echo.
echo 🔧 Email Automation AI - Quick Database Fix
echo ==========================================
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ Error: This script must be run from the project root directory
    echo Please navigate to your email-automation-ai folder and try again.
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo ✅ Project directory confirmed
echo.

REM Check if .env.local exists
if not exist .env.local (
    echo ⚠️  .env.local file not found
    echo Please ensure your Supabase credentials are configured in .env.local
    echo Required variables:
    echo   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    echo   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    echo.
    pause
    exit /b 1
)

echo ✅ Environment file found
echo.

REM Install dotenv if needed
echo 📦 Checking dependencies...
npm list dotenv >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dotenv...
    npm install dotenv
)

echo.
echo 🚀 Running database migration...
echo.

REM Run the migration script
node migrate-database.js

echo.
echo 📋 Migration completed. Check the output above for results.
echo.
pause