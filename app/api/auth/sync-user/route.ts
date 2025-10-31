import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';
import { supabase as authClient } from '@/lib/auth';

export async function POST() {
  try {
    // Get the currently authenticated user
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('Syncing user to database:', user.id, user.email);

    const supabase = getServerClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already exists in database',
        user_id: user.id,
        email: user.email
      });
    }

    // Create user in custom users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email
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
      user_id: user.id,
      email: user.email
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
