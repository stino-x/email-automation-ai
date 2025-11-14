// API Route: Toggle Facebook Service
import { NextRequest, NextResponse } from 'next/server';
import { validateFacebookAuth, createUnauthorizedResponse } from '@/lib/facebook/auth';
import { getUser } from '@/lib/auth';
import { updateFacebookServiceStatus } from '@/lib/facebook/queries';

export async function POST(request: NextRequest) {
  if (!validateFacebookAuth(request)) {
    return createUnauthorizedResponse();
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { isActive } = await request.json();
    await updateFacebookServiceStatus(user.id, isActive);
    
    // TODO: Notify worker service to start/stop monitoring
    
    return NextResponse.json({ 
      success: true, 
      message: isActive ? 'Facebook monitoring started' : 'Facebook monitoring stopped'
    });
  } catch (error) {
    console.error('Error toggling Facebook service:', error);
    return NextResponse.json({ error: 'Failed to toggle service' }, { status: 500 });
  }
}
