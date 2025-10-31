import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/auth';
import { deleteGoogleTokens } from '@/lib/supabase/queries';
import type { GoogleAuthResponse } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 400 }
      );
    }

    const authUrl = getAuthUrl(userId);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
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

    console.log('Disconnecting Google account for user:', userId);
    await deleteGoogleTokens(userId);
    console.log('Google tokens deleted successfully');

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
