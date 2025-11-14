// API Route: Facebook Auth Check
import { NextRequest, NextResponse } from 'next/server';
import { validateFacebookAuth, createUnauthorizedResponse } from '@/lib/facebook/auth';
import { getUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Check Facebook-specific auth
  if (!validateFacebookAuth(request)) {
    return createUnauthorizedResponse();
  }

  // Also check if user is logged into the main app
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Facebook section authenticated',
    userId: user.id 
  });
}
