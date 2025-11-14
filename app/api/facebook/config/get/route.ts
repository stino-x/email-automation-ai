// API Route: Get Facebook Configuration
import { NextRequest, NextResponse } from 'next/server';
import { validateFacebookAuth, createUnauthorizedResponse } from '@/lib/facebook/auth';
import { getUser } from '@/lib/auth';
import { getFacebookConfiguration } from '@/lib/facebook/queries';

export async function GET(request: NextRequest) {
  if (!validateFacebookAuth(request)) {
    return createUnauthorizedResponse();
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const config = await getFacebookConfiguration(user.id);
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching Facebook configuration:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}
