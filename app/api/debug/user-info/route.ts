import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';

// This is a debug endpoint to check token storage directly
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // Check user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
        error: userError.message
      });
    }

    // Check tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('google_tokens')
      .select('user_id, created_at, updated_at, expires_at, scopes')
      .eq('user_id', userId)
      .single();

    // Check configuration
    const { data: config, error: configError } = await supabase
      .from('configurations')
      .select('*')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      success: true,
      user: user,
      tokens: tokens ? {
        found: true,
        user_id: tokens.user_id,
        created_at: tokens.created_at,
        updated_at: tokens.updated_at,
        expires_at: tokens.expires_at,
        scopes: tokens.scopes
      } : {
        found: false,
        error: tokensError?.message
      },
      configuration: config ? {
        found: true,
        is_active: config.is_active,
        monitored_emails_count: Array.isArray(config.monitored_emails) ? config.monitored_emails.length : 0
      } : {
        found: false,
        error: configError?.message
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get debug info'
      },
      { status: 500 }
    );
  }
}
