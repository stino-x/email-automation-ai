#!/usr/bin/env node
/**
 * Debug Multi-Account Connection Issue
 */

require('dotenv').config({ path: '.env.test.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

const testUserId = process.env.TEST_USER_ID;

async function debugMultiAccount() {
  console.log('🔍 Debugging Multi-Account Connection');
  console.log('====================================');
  console.log('');

  // Check current tokens
  const { data: tokens } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', testUserId)
    .order('created_at');

  console.log(`📋 Current tokens in database: ${tokens?.length || 0}`);
  tokens?.forEach((token, i) => {
    console.log(`${i+1}. Email: ${token.google_email}`);
    console.log(`   Created: ${token.created_at}`);
    console.log(`   Updated: ${token.updated_at}`);
    console.log(`   Valid: ${new Date(token.expires_at) > new Date()}`);
    console.log('');
  });

  // Check for any constraints that might prevent insertion
  console.log('🔍 Checking database constraints...');
  
  // Try to manually insert a test record to see what happens
  const testEmail = 'test.second.account@gmail.com';
  console.log(`⚡ Testing insertion of second account: ${testEmail}`);
  
  const { data: insertTest, error: insertError } = await supabase
    .from('google_tokens')
    .insert({
      user_id: testUserId,
      google_email: testEmail,
      account_label: `Test Account (${testEmail})`,
      access_token: 'test_token',
      refresh_token: 'test_refresh',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['test']
    })
    .select();

  if (insertError) {
    console.log('❌ Insert failed:', insertError.message);
    console.log('   This suggests a database constraint is preventing multiple accounts');
    
    // Check if it's a unique constraint issue
    if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
      console.log('🔧 Likely cause: UNIQUE constraint still exists on user_id');
      console.log('   Need to re-run the migration to remove the constraint');
    }
  } else {
    console.log('✅ Test insertion successful:', insertTest);
    console.log('   Database supports multiple accounts, issue is in the auth flow');
    
    // Clean up test record
    await supabase
      .from('google_tokens')
      .delete()
      .eq('google_email', testEmail);
    console.log('🧹 Cleaned up test record');
  }

  // Check if the migration actually worked
  console.log('');
  console.log('🔍 Checking migration status...');
  
  try {
    // Check if the unique constraint was actually removed
    const { data: constraints } = await supabase
      .rpc('sql', { 
        query: `
        SELECT 
          conname as constraint_name,
          contype as constraint_type,
          confupdtype,
          confdeltype
        FROM pg_constraint 
        WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'google_tokens')
        AND contype = 'u';
        `
      });
    
    if (constraints && constraints.length > 0) {
      console.log('⚠️  Found unique constraints:');
      constraints.forEach(c => {
        console.log(`   - ${c.constraint_name} (${c.constraint_type})`);
      });
    } else {
      console.log('✅ No unique constraints found on google_tokens');
    }
  } catch (error) {
    console.log('Could not check constraints directly');
  }
}

debugMultiAccount().catch(console.error);