import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';

/**
 * Admin endpoint to sync ALL existing Supabase Auth users to custom users table
 * This is useful for one-time migration of users who signed up before tables were created
 * 
 * Security: Add authentication check in production!
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getServerClient();

    // Note: This requires service_role key to access auth.users
    // Regular anon key cannot query auth.users table
    
    console.log('Starting bulk user sync...');

    // Get all auth users (requires service role)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { success: false, message: `Failed to fetch auth users: ${authError.message}` },
        { status: 500 }
      );
    }

    console.log(`Found ${authUsers.users.length} auth users`);

    // Get existing custom users
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('id');

    if (existingError) {
      console.error('Error fetching existing users:', existingError);
      return NextResponse.json(
        { success: false, message: `Failed to fetch existing users: ${existingError.message}` },
        { status: 500 }
      );
    }

    const existingUserIds = new Set(existingUsers?.map(u => u.id) || []);
    console.log(`Found ${existingUserIds.size} existing custom users`);

    // Find users that need to be synced
    const usersToSync = authUsers.users.filter(u => !existingUserIds.has(u.id));
    console.log(`Need to sync ${usersToSync.length} users`);

    if (usersToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users are already synced',
        total_auth_users: authUsers.users.length,
        synced_users: 0,
        already_synced: existingUserIds.size
      });
    }

    // Insert missing users
    const usersData = usersToSync.map(u => ({
      id: u.id,
      email: u.email || '',
      created_at: u.created_at
    }));

    const { error: insertError } = await supabase
      .from('users')
      .insert(usersData);

    if (insertError) {
      console.error('Error inserting users:', insertError);
      return NextResponse.json(
        { success: false, message: `Failed to insert users: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log(`Successfully synced ${usersToSync.length} users`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${usersToSync.length} users`,
      total_auth_users: authUsers.users.length,
      synced_users: usersToSync.length,
      already_synced: existingUserIds.size
    });

  } catch (error) {
    console.error('Error in bulk sync:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync users'
      },
      { status: 500 }
    );
  }
}
