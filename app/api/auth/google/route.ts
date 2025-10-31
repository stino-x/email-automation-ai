import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google/auth';

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
