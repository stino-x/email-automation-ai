import { NextRequest, NextResponse } from 'next/server';
import { getGoogleTokens } from '@/lib/supabase/queries';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required', has_tokens: false },
        { status: 400 }
      );
    }

    const tokens = await getGoogleTokens(userId);
    
    if (!tokens) {
      return NextResponse.json({
        success: true,
        has_tokens: false,
        message: 'No Google tokens found in database'
      });
    }

    // Return token information (but not the actual tokens for security)
    return NextResponse.json({
      success: true,
      has_tokens: true,
      scopes: tokens.scopes,
      expires_at: tokens.expires_at,
      created_at: tokens.created_at,
      updated_at: tokens.updated_at,
      has_refresh_token: !!tokens.refresh_token,
      has_access_token: !!tokens.access_token
    });

  } catch (error) {
    console.error('Error checking token status:', error);
    return NextResponse.json(
      {
        success: false,
        has_tokens: false,
        message: error instanceof Error ? error.message : 'Failed to check token status'
      },
      { status: 500 }
    );
  }
}
