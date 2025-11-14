// API Route: Get Facebook Activity Logs
import { NextRequest, NextResponse } from 'next/server';
import { validateFacebookAuth, createUnauthorizedResponse } from '@/lib/facebook/auth';
import { getUser } from '@/lib/auth';
import { getFacebookActivityLogs } from '@/lib/facebook/queries';

export async function GET(request: NextRequest) {
  if (!validateFacebookAuth(request)) {
    return createUnauthorizedResponse();
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const logs = await getFacebookActivityLogs(user.id, limit);
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching Facebook logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
