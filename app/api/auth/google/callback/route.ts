import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserEmail } from '@/lib/google/auth';
import { saveGoogleTokens } from '@/lib/supabase/queries';
import type { GoogleAuthResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const userId = searchParams.get('state'); // Pass user ID in state parameter

    console.log('=== Google OAuth Callback ===');
    console.log('Code received:', !!code);
    console.log('User ID:', userId);

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

    // Fetch the Google account email address
    console.log('Fetching Google account email...');
    try {
      const googleEmail = await getUserEmail(tokens);
      tokens.google_email = googleEmail;
      tokens.account_label = 'Primary Account'; // Default label, user can change in settings
      console.log('Google account email:', googleEmail);
    } catch (error) {
      console.error('Failed to fetch Google email (non-fatal):', error);
      // Continue without email - backward compatible
    }

    // Save tokens to database (skip email verification - not needed)
    console.log('Saving tokens to database for user:', userId);
    await saveGoogleTokens(tokens);
    console.log('Tokens saved successfully');

    // Redirect back to settings page
    return NextResponse.redirect(new URL('/settings?google_connected=true', request.url));

  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(new URL('/settings?google_connected=false', request.url));
  }
}
