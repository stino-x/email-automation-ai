#!/usr/bin/env node
/**
 * Debug Google Tokens - Check what's actually in the database
 */

require('dotenv').config({ path: '.env.test.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const testUserId = process.env.TEST_USER_ID;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugGoogleTokens() {
  console.log('🔍 Debugging Google Tokens');
  console.log('==========================');
  console.log(`User ID: ${testUserId}`);
  console.log('');

  // Check all google_tokens for this user
  const { data: tokens, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', testUserId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching tokens:', error);
    return;
  }

  console.log(`📋 Found ${tokens.length} Google token(s):`);
  console.log('');

  if (tokens.length === 0) {
    console.log('⚠️  No Google accounts connected for this user');
    console.log('');
    console.log('Possible issues:');
    console.log('1. Google auth not completing properly');
    console.log('2. User ID mismatch in auth flow');
    console.log('3. Database constraints preventing multiple accounts');
    return;
  }

  tokens.forEach((token, index) => {
    console.log(`🔗 Account ${index + 1}:`);
    console.log(`   ID: ${token.id}`);
    console.log(`   Email: ${token.google_email || '❌ NOT SET'}`);
    console.log(`   Label: ${token.account_label || '❌ NOT SET'}`);
    console.log(`   Expires: ${token.expires_at}`);
    console.log(`   Valid: ${new Date(token.expires_at) > new Date() ? '✅ Yes' : '❌ Expired'}`);
    console.log(`   Scopes: ${token.scopes ? token.scopes.join(', ') : 'NOT SET'}`);
    console.log(`   Created: ${token.created_at}`);
    console.log(`   Updated: ${token.updated_at}`);
    console.log('');
  });

  // Check what the status API returns
  console.log('🔍 Testing Status API Response:');
  console.log('');

  const allGoogleAccounts = tokens.map(token => ({
    email: token.google_email || 'Primary Account',
    is_valid: new Date(token.expires_at) > new Date(),
    created_at: token.created_at,
    account_label: token.account_label || 'Primary Account'
  }));

  console.log('📋 Status API would return:');
  allGoogleAccounts.forEach((account, index) => {
    console.log(`${index + 1}. ${account.email} (${account.is_valid ? 'Valid' : 'Expired'})`);
  });

  // Check for database constraints
  console.log('');
  console.log('🔍 Checking Database Constraints:');

  const { data: constraints, error: constraintError } = await supabase
    .rpc('sql', { 
      query: `
        SELECT conname, contype 
        FROM pg_constraint 
        WHERE conrelid = 'google_tokens'::regclass;
      `
    });

  if (!constraintError && constraints) {
    console.log('Database constraints:', constraints);
  } else {
    console.log('Could not check constraints (this is normal)');
  }
}

debugGoogleTokens().catch(console.error);