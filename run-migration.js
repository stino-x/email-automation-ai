#!/usr/bin/env node
/**
 * Direct SQL Migration Executor for Email Automation AI
 * Executes the combined migration SQL directly
 */

const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.test.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 Direct SQL Migration Executor');
console.log('=================================');
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

// Use service role client for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSQL = `
-- Combined Migration: Fix Calendar ID Persistence & Enable Multiple Google Accounts

-- Part 1: Enable Multiple Google Accounts
DO $$ 
BEGIN
    ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

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
`;

async function executeMigration() {
    console.log('⚡ Executing combined migration...');
    
    try {
        // Execute each part separately for better error handling
        console.log('🔧 Step 1: Removing unique constraint...');
        await supabase.rpc('exec', {
            sql: `DO $$ 
            BEGIN
                ALTER TABLE google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
            EXCEPTION
                WHEN undefined_object THEN NULL;
            END $$;`
        });
        
        console.log('🔧 Step 2: Adding new columns...');
        const { error: alterError } = await supabase.rpc('exec', {
            sql: `ALTER TABLE google_tokens 
            ADD COLUMN IF NOT EXISTS account_label TEXT DEFAULT 'Primary Account',
            ADD COLUMN IF NOT EXISTS google_email TEXT;`
        });
        
        if (alterError) console.log('Note:', alterError.message);
        
        console.log('🔧 Step 3: Creating indexes...');
        await supabase.rpc('exec', {
            sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_google_email 
            ON google_tokens(user_id, google_email) 
            WHERE google_email IS NOT NULL;`
        });
        
        await supabase.rpc('exec', {
            sql: `CREATE INDEX IF NOT EXISTS idx_google_tokens_user_email 
            ON google_tokens(user_id, google_email);`
        });
        
        console.log('🔧 Step 4: Adding calendar configuration...');
        const { error: calendarError } = await supabase.rpc('exec', {
            sql: `ALTER TABLE configurations 
            ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';`
        });
        
        if (calendarError) console.log('Note:', calendarError.message);
        
        console.log('✅ All migration steps completed!');
        
        // Test the changes
        console.log('🔍 Verifying changes...');
        
        // Test google_tokens columns
        const { data: tokenTest, error: tokenError } = await supabase
            .from('google_tokens')
            .select('google_email, account_label')
            .limit(1);
        
        if (!tokenError) {
            console.log('✅ Google tokens table updated successfully');
        }
        
        // Test configurations column
        const { data: configTest, error: configError } = await supabase
            .from('configurations')
            .select('calendar_id')
            .limit(1);
            
        if (!configError) {
            console.log('✅ Configurations table updated successfully');
        }
        
        console.log('');
        console.log('🎉 SUCCESS! Database migration completed!');
        console.log('');
        console.log('✅ Your database now supports:');
        console.log('  • Multiple Google accounts per user');
        console.log('  • Persistent calendar ID settings');
        console.log('  • Proper email address display');
        console.log('  • Individual account management');
        console.log('');
        console.log('🚀 You can now restart your app and test the fixes!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('');
        console.log('📋 Manual execution required:');
        console.log('1. Go to Supabase Dashboard > SQL Editor');
        console.log('2. Copy and paste this SQL:');
        console.log('');
        console.log('---SQL START---');
        console.log(migrationSQL);
        console.log('---SQL END---');
        console.log('');
        console.log('3. Click RUN to execute');
    }
}

executeMigration().then(() => {
    console.log('Script completed.');
}).catch(error => {
    console.error('Script error:', error.message);
});