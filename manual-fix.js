#!/usr/bin/env node
/**
 * Manual Token Fix - Update existing token with proper email
 */

require('dotenv').config({ path: '.env.test.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

const testUserId = process.env.TEST_USER_ID;
const testUserEmail = process.env.TEST_USER_EMAIL;

async function manualFix() {
  console.log('🔧 Manual Token Fix');
  console.log('===================');
  console.log('');

  // Update the existing token with the user's email
  console.log('⚡ Updating existing token with email:', testUserEmail);
  
  const { data, error } = await supabase
    .from('google_tokens')
    .update({ 
      google_email: testUserEmail,
      account_label: `Primary (${testUserEmail})`
    })
    .eq('user_id', testUserId)
    .select();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Successfully updated token');
    console.log('📋 Updated record:', data[0]);
  }

  // Verify the change
  console.log('');
  console.log('🔍 Verifying update...');
  
  const { data: tokens } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', testUserId);

  console.log(`📋 User now has ${tokens.length} token(s):`);
  tokens?.forEach((token, i) => {
    console.log(`${i+1}. ${token.google_email} (${token.account_label})`);
  });
}

manualFix().catch(console.error);