import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserEmail } from '@/lib/google/auth';
import { saveGoogleTokens } from '@/lib/supabase/queries';
import type { GoogleAuthResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const userId = searchParams.get('state'); // Pass user ID in state parameter

    console.log('=== Google OAuth Callback DEBUG ===');
    console.log('Code received:', !!code);
    console.log('User ID:', userId);
    console.log('Full URL:', request.nextUrl.toString());

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Authorization code not provided' } as GoogleAuthResponse,
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID not provided' } as GoogleAuthResponse,
        { status: 400 }
      );
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokens = await getTokensFromCode(code);
    tokens.user_id = userId;
    console.log('Tokens received:', {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_at: tokens.expires_at,
      scopes: tokens.scopes
    });

    // Fetch the Google account email address (REQUIRED for multi-account support)
    console.log('Fetching Google account email...');
    console.log('📋 Tokens for email fetch:', {
      access_token_length: tokens.access_token?.length,
      access_token_preview: tokens.access_token?.substring(0, 20) + '...',
      refresh_token_length: tokens.refresh_token?.length,
      expires_at: tokens.expires_at,
      scopes: tokens.scopes
    });
    
    let googleEmail: string;
    
    try {
      googleEmail = await getUserEmail(tokens);
      console.log('✅ Successfully fetched Google email:', googleEmail);
    } catch (error) {
      console.error('❌ Primary method failed, trying alternative approach:', error);
      
      // Fallback: Try using Gmail API to get user's email
      try {
        console.log('🔄 Attempting fallback: using Gmail API...');
        
        // Create Gmail API client
        const authClient = new (require('googleapis').google.auth.OAuth2)(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        
        authClient.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: new Date(tokens.expires_at).getTime()
        });
        
        const gmail = require('googleapis').google.gmail({ version: 'v1', auth: authClient });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        googleEmail = profile.data.emailAddress;
        
        console.log('✅ Fallback successful, got email:', googleEmail);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        
        // Last resort: Generate a temporary identifier and save without email
        // We'll update it later when the user uses the application
        const tempEmail = `temp_${tokens.user_id.substring(0, 8)}@unknown.google.com`;
        console.log('⚠️ Using temporary email identifier:', tempEmail);
        googleEmail = tempEmail;
      }
    }
    
    tokens.google_email = googleEmail;
    
    // Set appropriate label - always include email for clarity
    tokens.account_label = googleEmail.includes('@unknown.google.com') ? 
      `Google Account (${tokens.user_id.substring(0, 8)})` : 
      `Account (${googleEmail})`;
    
    console.log('✅ Final account details:', {
      google_email: tokens.google_email,
      account_label: tokens.account_label,
      user_id: tokens.user_id,
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_at: tokens.expires_at
    });

    // Save tokens to database (skip email verification - not needed)
    console.log('💾 Saving tokens to database for user:', userId);
    console.log('💾 Email being saved:', tokens.google_email);
    
    try {
      await saveGoogleTokens(tokens);
      console.log('✅ Tokens saved successfully to database');
    } catch (saveError) {
      console.error('❌ Failed to save tokens:', saveError);
      return NextResponse.redirect(new URL('/settings?google_connected=false&error=save_failed', request.url));
    }

    // Redirect back to settings page
    return NextResponse.redirect(new URL('/settings?google_connected=true', request.url));

  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(new URL('/settings?google_connected=false', request.url));
  }
}
