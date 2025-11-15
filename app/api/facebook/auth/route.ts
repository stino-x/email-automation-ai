// API Route: Facebook Auth Check
import { NextRequest, NextResponse } from 'next/server';
import { validateFacebookAuth, createUnauthorizedResponse } from '@/lib/facebook/auth';
import { getUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Also check if user is logged into the main app
  const user = await getUser();
  if (!user) {
    console.error('[Facebook Auth] User not logged into main app');
    return NextResponse.json({ error: 'Not authenticated to main app' }, { status: 401 });
  }

  // Check Facebook-specific auth
  const isValid = validateFacebookAuth(request);
  console.log('[Facebook Auth] Validation result:', isValid);
  console.log('[Facebook Auth] Expected username:', process.env.FACEBOOK_AUTH_USERNAME);
  console.log('[Facebook Auth] Has password env:', !!process.env.FACEBOOK_AUTH_PASSWORD);
  
  if (!isValid) {
    return createUnauthorizedResponse();
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Facebook section authenticated',
    userId: user.id 
  });
}
