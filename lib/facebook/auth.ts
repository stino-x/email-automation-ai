// Facebook authentication middleware
import { NextRequest, NextResponse } from 'next/server';

const FACEBOOK_USERNAME = process.env.FACEBOOK_AUTH_USERNAME || '';
const FACEBOOK_PASSWORD = process.env.FACEBOOK_AUTH_PASSWORD || '';

export function validateFacebookAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  console.log('[Facebook Auth Validate] Auth header present:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.log('[Facebook Auth Validate] Missing or invalid auth header format');
    return false;
  }

  try {
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    console.log('[Facebook Auth Validate] Received username:', username);
    console.log('[Facebook Auth Validate] Expected username:', FACEBOOK_USERNAME);
    console.log('[Facebook Auth Validate] Password match:', password === FACEBOOK_PASSWORD);

    return username === FACEBOOK_USERNAME && password === FACEBOOK_PASSWORD;
  } catch (error) {
    console.error('[Facebook Auth Validate] Error parsing credentials:', error);
    return false;
  }
}

export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized. Facebook section requires special authentication.' },
    { 
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Facebook Monitoring"'
      }
    }
  );
}
