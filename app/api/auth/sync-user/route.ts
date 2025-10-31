import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID required in headers' },
        { status: 400 }
      );
    }

    console.log('Syncing user to database:', userId);

    const supabase = getServerClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists in database',
        user_id: existingUser.id,
        email: existingUser.email
      });
    }

    // User doesn't exist in custom table - need to get email from body or auth
    const body = await request.json().catch(() => ({}));
    const email = body.email;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email required when creating new user' },
        { status: 400 }
      );
    }

    // Create user in custom users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email
      });

    if (insertError) {
      console.error('Error inserting user:', insertError);
      return NextResponse.json(
        { success: false, message: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('User synced successfully');

    return NextResponse.json({
      success: true,
      message: 'User synced to database successfully',
      user_id: userId,
      email: email
    });

  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync user'
      },
      { status: 500 }
    );
  }
}
