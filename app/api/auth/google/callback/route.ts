import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserEmail } from '@/lib/google/auth';
import { saveGoogleTokens } from '@/lib/supabase/queries';
import type { GoogleAuthResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const userId = searchParams.get('state'); // Pass user ID in state parameter

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
    const tokens = await getTokensFromCode(code);
    tokens.user_id = userId;

    // Get user's Gmail address for confirmation
    await getUserEmail(tokens);

    // Save tokens to database
    await saveGoogleTokens(tokens);

    // Redirect back to settings page
    return NextResponse.redirect(new URL('/settings?google_connected=true', request.url));

  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(new URL('/settings?google_connected=false', request.url));
  }
}

// Disconnect endpoint
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' } as GoogleAuthResponse,
        { status: 401 }
      );
    }

    const { deleteGoogleTokens } = await import('@/lib/supabase/queries');
    await deleteGoogleTokens(userId);

    return NextResponse.json({
      success: true,
      message: 'Google account disconnected',
      connected: false
    } as GoogleAuthResponse);

  } catch (error) {
    console.error('Error disconnecting Google:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to disconnect'
      } as GoogleAuthResponse,
      { status: 500 }
    );
  }
}
