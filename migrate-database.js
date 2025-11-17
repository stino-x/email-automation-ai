#!/usr/bin/env node

/**
 * Database Migration Script for Email Automation AI
 * Automatically fixes calendar ID persistence and enables multiple Google accounts
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Email Automation AI - Database Migration Script');
console.log('==================================================');
console.log('');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.error('❌ Error: This script must be run from the project root directory');
    console.error('Please navigate to your email-automation-ai folder and try again.');
    process.exit(1);
}

// Check if required dependencies exist
try {
    require('@supabase/supabase-js');
} catch (error) {
    console.error('❌ Error: @supabase/supabase-js not found');
    console.error('Please run: npm install @supabase/supabase-js');
    process.exit(1);
}

// Load environment variables from multiple possible files
const envFiles = ['.env.local', '.env.test.local', '.env'];
let envLoaded = false;

for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
        console.log(`📄 Loading environment from: ${envFile}`);
        require('dotenv').config({ path: envFile });
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    console.log('⚠️  No .env file found, trying process environment...');
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Try different possible variable names for the service key
const supabaseServiceKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('');
    console.error('Required environment variables:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - One of these API keys:');
    console.error('    • SUPABASE_SERVICE_ROLE_KEY');
    console.error('    • SUPABASE_SERVICE_KEY');
    console.error('    • SUPABASE_ANON_KEY');
    console.error('    • NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('');
    console.error('Current environment variables found:');
    console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Found' : '❌ Missing'}`);
    console.error(`  SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Found' : '❌ Missing'}`);
    console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing'}`);
    console.error(`  SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing'}`);
    console.error('');
    console.error('Please add these to one of: .env.local, .env.test.local, or .env');
    process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('✅ Supabase URL found');
console.log('✅ API key found');
console.log('');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrationStatus() {
    console.log('🔍 Checking current database state...');
    
    // Check if google_email column exists (multiple accounts migration)
    let needsGoogleMigration = false;
    try {
        await supabase.from('google_tokens').select('google_email').limit(1);
        console.log('✅ Multiple Google Accounts: Already applied');
    } catch (error) {
        console.log('⚠️  Multiple Google Accounts: Migration needed');
        needsGoogleMigration = true;
    }
    
    // Check if calendar_id column exists
    let needsCalendarMigration = false;
    try {
        await supabase.from('configurations').select('calendar_id').limit(1);
        console.log('✅ Calendar Configuration: Already applied');
    } catch (error) {
        console.log('⚠️  Calendar Configuration: Migration needed');
        needsCalendarMigration = true;
    }
    
    return { needsGoogleMigration, needsCalendarMigration };
}

async function executeSql(sql, description) {
    console.log(`⚡ ${description}...`);
    
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) throw error;
        
        console.log(`✅ ${description} - Success`);
        return true;
    } catch (error) {
        console.error(`❌ ${description} - Failed:`);
        console.error(`   ${error.message}`);
        return false;
    }
}

async function applyMigrations() {
    console.log('');
    console.log('📋 Applying database migrations...');
    console.log('');
    
    const { needsGoogleMigration, needsCalendarMigration } = await checkMigrationStatus();
    
    if (!needsGoogleMigration && !needsCalendarMigration) {
        console.log('🎉 All migrations are already applied!');
        console.log('Your database is up to date.');
        return true;
    }
    
    let allSuccess = true;
    
    // Apply Multiple Google Accounts Migration
    if (needsGoogleMigration) {
        console.log('🔄 Applying Multiple Google Accounts Migration...');
        
        // Step 1: Drop unique constraint
        const sql1 = `
            DO $$
            BEGIN
                ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
            EXCEPTION
                WHEN undefined_object THEN NULL;
            END $$;
        `;
        
        // Step 2: Add columns
        const sql2 = `
            ALTER TABLE google_tokens 
            ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT 'Primary Account',
            ADD COLUMN IF NOT EXISTS google_email TEXT;
        `;
        
        // Step 3: Create indexes
        const sql3 = `
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_google_email 
            ON google_tokens(user_id, google_email) 
            WHERE google_email IS NOT NULL;
        `;
        
        const sql4 = `
            CREATE INDEX IF NOT EXISTS idx_google_tokens_user_email 
            ON google_tokens(user_id, google_email);
        `;
        
        const success1 = await executeSql(sql1, 'Removing unique constraint');
        const success2 = await executeSql(sql2, 'Adding new columns');
        const success3 = await executeSql(sql3, 'Creating unique index');
        const success4 = await executeSql(sql4, 'Creating lookup index');
        
        if (success1 && success2 && success3 && success4) {
            console.log('✅ Multiple Google Accounts migration completed!');
        } else {
            allSuccess = false;
        }
    }
    
    // Apply Calendar Configuration Migration
    if (needsCalendarMigration) {
        console.log('🔄 Applying Calendar Configuration Migration...');
        
        const sql5 = `
            ALTER TABLE configurations 
            ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';
        `;
        
        const success5 = await executeSql(sql5, 'Adding calendar_id column');
        
        if (success5) {
            console.log('✅ Calendar Configuration migration completed!');
        } else {
            allSuccess = false;
        }
    }
    
    return allSuccess;
}

async function verifyMigrations() {
    console.log('');
    console.log('📋 Verifying migrations...');
    
    // Wait a moment for changes to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { needsGoogleMigration, needsCalendarMigration } = await checkMigrationStatus();
    
    return !needsGoogleMigration && !needsCalendarMigration;
}

async function main() {
    try {
        const success = await applyMigrations();
        
        if (success) {
            const verified = await verifyMigrations();
            
            if (verified) {
                console.log('');
                console.log('🎉 SUCCESS! All database fixes have been applied!');
                console.log('');
                console.log('✅ Fixed Issues:');
                console.log('  • Calendar ID will now persist when saved');
                console.log('  • Multiple Google accounts are supported');
                console.log('  • Connected emails show actual email addresses');
                console.log('  • New Google connections appear immediately');
                console.log('');
                console.log('🚀 Next Steps:');
                console.log('  1. Restart your development server');
                console.log('  2. Test the configuration page');
                console.log('  3. Try connecting additional Google accounts');
                console.log('');
            } else {
                console.log('❌ Verification failed. Some migrations may not have applied correctly.');
            }
        } else {
            console.log('');
            console.log('❌ Migration failed. Manual intervention may be required.');
            console.log('');
            console.log('Please check the error messages above and:');
            console.log('1. Ensure your database permissions are correct');
            console.log('2. Try running the SQL manually in Supabase SQL Editor');
            console.log('3. Check the database/enable-multiple-google-accounts.sql file');
            console.log('4. Check the database/add-calendar-configuration.sql file');
        }
        
    } catch (error) {
        console.error('❌ Script failed with error:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('1. Check your .env.local file has the correct Supabase credentials');
        console.log('2. Ensure your Supabase project is accessible');
        console.log('3. Try using SUPABASE_SERVICE_ROLE_KEY instead of SUPABASE_ANON_KEY');
        console.log('4. Run the migrations manually in Supabase SQL Editor');
    }
}

// Run the script
main().then(() => {
    console.log('Script completed.');
}).catch(error => {
    console.error('Script error:', error);
    process.exit(1);
});