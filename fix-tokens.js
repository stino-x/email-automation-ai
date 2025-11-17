#!/usr/bin/env node
/**
 * Fix Google Tokens - Update existing token and test multi-account
 */

require('dotenv').config({ path: '.env.test.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const testUserId = process.env.TEST_USER_ID;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixGoogleTokens() {
  console.log('🔧 Fixing Google Tokens');
  console.log('=======================');
  console.log('');

  // First, let's get the existing token
  const { data: existingTokens, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', testUserId);

  if (error) {
    console.error('❌ Error fetching tokens:', error);
    return;
  }

  if (existingTokens.length === 0) {
    console.log('⚠️  No tokens found for this user');
    return;
  }

  console.log(`📋 Found ${existingTokens.length} existing token(s)`);

  // Check if any tokens are missing google_email
  const tokensWithoutEmail = existingTokens.filter(token => !token.google_email);
  
  if (tokensWithoutEmail.length > 0) {
    console.log('🔧 Fixing tokens without email addresses...');
    
    for (const token of tokensWithoutEmail) {
      console.log(`⚡ Fetching email for token ${token.id}...`);
      
      try {
        // Use the token to fetch the Google email
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${token.access_token}`
          }
        });
        
        if (response.ok) {
          const userInfo = await response.json();
          console.log(`✅ Found email: ${userInfo.email}`);
          
          // Update the token with the email
          const { error: updateError } = await supabase
            .from('google_tokens')
            .update({ 
              google_email: userInfo.email,
              account_label: `Account (${userInfo.email})`
            })
            .eq('id', token.id);
            
          if (updateError) {
            console.error(`❌ Failed to update token ${token.id}:`, updateError);
          } else {
            console.log(`✅ Updated token ${token.id} with email ${userInfo.email}`);
          }
        } else {
          console.log(`⚠️  Could not fetch email for token ${token.id} - token may be expired`);
        }
      } catch (error) {
        console.log(`⚠️  Error fetching email for token ${token.id}:`, error.message);
      }
    }
  }

  // Now check the updated state
  console.log('');
  console.log('📋 Updated token state:');
  const { data: updatedTokens } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', testUserId)
    .order('created_at', { ascending: true });

  updatedTokens?.forEach((token, index) => {
    console.log(`${index + 1}. ${token.google_email || 'NO EMAIL'} (${token.account_label})`);
  });

  // Test what the status API would return
  console.log('');
  console.log('📋 Status API would now show:');
  const googleAccounts = updatedTokens?.map(token => ({
    email: token.google_email || 'Primary Account',
    is_valid: new Date(token.expires_at) > new Date(),
    created_at: token.created_at,
    account_label: token.account_label || 'Primary Account'
  })) || [];

  googleAccounts.forEach((account, index) => {
    console.log(`${index + 1}. Email: ${account.email}`);
    console.log(`   Valid: ${account.is_valid ? '✅ Yes' : '❌ Expired'}`);
    console.log(`   Label: ${account.account_label}`);
  });

  if (googleAccounts.length === 1 && googleAccounts[0].email !== 'Primary Account') {
    console.log('');
    console.log('🎉 Great! Now your existing account should show the real email address.');
    console.log('📝 Try connecting another Google account to test multi-account support.');
  }
}

fixGoogleTokens().catch(console.error);