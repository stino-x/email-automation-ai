// API Route: Facebook Auth Check
import { NextRequest, NextResponse } from 'next/server';
import { validateFacebookAuth, createUnauthorizedResponse } from '@/lib/facebook/auth';

export async function POST(request: NextRequest) {
  // Check Facebook-specific auth (Basic Auth)
  // Note: User must already be logged into main app to access the Facebook page
  // This is just an additional security layer for the Facebook section
  
  const isValid = validateFacebookAuth(request);
  console.log('[Facebook Auth] Validation result:', isValid);
  console.log('[Facebook Auth] Expected username:', process.env.FACEBOOK_AUTH_USERNAME);
  console.log('[Facebook Auth] Has password env:', !!process.env.FACEBOOK_AUTH_PASSWORD);
  
  if (!isValid) {
    return createUnauthorizedResponse();
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Facebook section authenticated'
  });
}
