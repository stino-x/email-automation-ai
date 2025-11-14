#!/usr/bin/env ts-node
/**
 * Facebook Session Extractor
 * 
 * This script logs into Facebook and extracts the session cookies (appState)
 * which can be stored in your database for automated message monitoring.
 * 
 * Usage:
 *   npx ts-node scripts/get-facebook-session.ts
 * 
 * Security Note:
 *   - Never commit the output appState to version control
 *   - Store it securely in your database only
 *   - This session expires after ~30 days
 */

import * as readline from 'readline';

// Using require for facebook-chat-api since it's CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const facebookChatApi = require('facebook-chat-api');

interface LoginCredentials {
  email: string;
  password: string;
}

async function getCredentials(): Promise<LoginCredentials> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Facebook Email: ', (email) => {
      rl.question('Facebook Password: ', (password) => {
        rl.close();
        resolve({ email, password });
      });
    });
  });
}

async function extractFacebookSession() {
  console.log('\n🔐 Facebook Session Extractor\n');
  console.log('⚠️  Your credentials are NOT stored - only used to generate session cookies\n');

  try {
    const credentials = await getCredentials();

    console.log('\n⏳ Logging into Facebook...');

    facebookChatApi({ 
      email: credentials.email, 
      password: credentials.password 
    }, (err: Error | null, api: { getAppState: () => unknown }) => {
      if (err) {
        console.error('\n❌ Login failed:', err.message);
        console.log('\nCommon issues:');
        console.log('  • Wrong email/password');
        console.log('  • 2FA enabled (try app-specific password)');
        console.log('  • Account locked/flagged by Facebook');
        console.log('  • IP blocked (try different network)');
        process.exit(1);
      }

      const appState = JSON.stringify(api.getAppState());

      console.log('\n✅ Login successful!\n');
      console.log('═══════════════════════════════════════════════════════');
      console.log('YOUR FACEBOOK SESSION (appState):');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log(appState);
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('⚠️  SAVE THIS SECURELY:');
      console.log('  1. Copy the entire JSON string above');
      console.log('  2. Go to Supabase → facebook_credentials table');
      console.log('  3. Insert with your user_id');
      console.log('  4. Set expires_at to ~30 days from now');
      console.log('═══════════════════════════════════════════════════════\n');

      process.exit(0);
    });
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

extractFacebookSession();
