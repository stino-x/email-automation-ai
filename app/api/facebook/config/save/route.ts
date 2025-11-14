// API Route: Save Facebook Configuration
import { NextRequest, NextResponse } from 'next/server';
import { validateFacebookAuth, createUnauthorizedResponse } from '@/lib/facebook/auth';
import { getUser } from '@/lib/auth';
import { saveFacebookConfiguration } from '@/lib/facebook/queries';
import type { FacebookConfiguration } from '@/types/facebook';

export async function POST(request: NextRequest) {
  if (!validateFacebookAuth(request)) {
    return createUnauthorizedResponse();
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const config = await saveFacebookConfiguration(user.id, body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configuration saved',
      config 
    });
  } catch (error) {
    console.error('Error saving Facebook configuration:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
