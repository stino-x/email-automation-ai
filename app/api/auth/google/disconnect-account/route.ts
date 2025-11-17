import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { GoogleAuthResponse } from '@/types';

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' } as GoogleAuthResponse,
        { status: 401 }
      );
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' } as GoogleAuthResponse,
        { status: 400 }
      );
    }

    console.log('Disconnecting specific Google account:', email, 'for user:', userId);
    
    // Delete the specific account's tokens
    const { error } = await supabase
      .from('google_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('google_email', email);

    if (error) {
      console.error('Error deleting specific Google tokens:', error);
      throw error;
    }

    console.log('Google tokens deleted successfully for email:', email);

    return NextResponse.json({
      success: true,
      message: `Google account ${email} disconnected`,
      connected: false
    } as GoogleAuthResponse);

  } catch (error) {
    console.error('Error disconnecting specific Google account:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to disconnect account'
      } as GoogleAuthResponse,
      { status: 500 }
    );
  }
}