import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Testing token insert for user:', userId);
    
    const serverClient = getServerClient();
    
    // Try to insert a test token
    const testToken = {
      user_id: userId,
      access_token: 'test_access_token_' + Date.now(),
      refresh_token: 'test_refresh_token_' + Date.now(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['test.scope']
    };

    console.log('Attempting to insert test token...');
    
    const { data, error } = await serverClient
      .from('google_tokens')
      .insert(testToken)
      .select()
      .single();

    if (error) {
      console.error('Insert failed:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        hint: error.hint || 'No hint available'
      }, { status: 500 });
    }

    console.log('Test token inserted successfully!');
    
    // Clean up test token
    await serverClient
      .from('google_tokens')
      .delete()
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      message: 'Test token insert worked! Your service role key is configured correctly.',
      inserted_data: data
    });

  } catch (error) {
    console.error('Test insert error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
