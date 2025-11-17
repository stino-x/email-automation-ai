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
    try {
      const googleEmail = await getUserEmail(tokens);
      tokens.google_email = googleEmail;
      
      // Set appropriate label - always include email for clarity
      tokens.account_label = `Account (${googleEmail})`;
      
      console.log('✅ Google account email:', googleEmail);
      console.log('✅ Account label:', tokens.account_label);
      console.log('📋 Token details:', {
        user_id: tokens.user_id,
        google_email: tokens.google_email,
        has_access_token: !!tokens.access_token,
        has_refresh_token: !!tokens.refresh_token,
        expires_at: tokens.expires_at
      });
    } catch (error) {
      console.error('❌ Failed to fetch Google email:', error);
      // For multi-account support, we NEED the email
      return NextResponse.redirect(new URL('/settings?google_connected=false&error=email_fetch_failed', request.url));
    }

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
