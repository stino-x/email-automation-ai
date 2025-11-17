#!/usr/bin/env node

require('dotenv').config({ path: '.env.test.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

async function testStatus() {
  console.log('🔍 Testing Current Status');
  console.log('=========================');
  
  // Get tokens directly
  const { data: tokens } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', process.env.TEST_USER_ID);

  console.log('📋 Database tokens:');
  tokens?.forEach((token, i) => {
    console.log(`${i+1}. Email: ${token.google_email || 'NOT SET'}`);
    console.log(`   Label: ${token.account_label || 'NOT SET'}`);
    console.log(`   Valid: ${new Date(token.expires_at) > new Date()}`);
    console.log('');
  });

  // What the settings page would show
  console.log('🖥️  Settings page would display:');
  const googleAccounts = tokens?.map((token, index) => ({
    email: token.google_email || 'Unknown Email',
    is_valid: new Date(token.expires_at) > new Date(),
    account_label: token.google_email ? `Account (${token.google_email})` : (index === 0 ? 'Primary Account' : `Account ${index + 1}`)
  })) || [];

  googleAccounts.forEach((account, index) => {
    const isPrimary = index === 0 && account.email !== 'Unknown Email';
    console.log(`${index + 1}. ${account.email}${isPrimary ? ' (Primary)' : ''}`);
    console.log(`   Status: ${account.is_valid ? 'Connected ✅' : 'Expired ❌'}`);
  });
}

testStatus().catch(console.error);