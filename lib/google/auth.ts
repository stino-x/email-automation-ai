import { google } from 'googleapis';
import type { GoogleTokens, CalendarEvent, GmailMessage } from '@/types';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',  // Needed to mark emails as read
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'  // Needed to create/modify calendar events
];

export function getAuthUrl(state?: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: state
  });
}

export async function getTokensFromCode(code: string): Promise<GoogleTokens> {
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }

  return {
    user_id: '', // Will be set by caller
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString(),
    scopes: tokens.scope ? tokens.scope.split(' ') : SCOPES
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: string }> {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  return {
    access_token: credentials.access_token,
    expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString()
  };
}

export function setCredentials(tokens: GoogleTokens) {
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: new Date(tokens.expires_at).getTime()
  });
}

// Gmail operations
export async function getUnreadEmails(
  tokens: GoogleTokens,
  senderEmail: string,
  keywords?: string[]
): Promise<GmailMessage[]> {
  setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  let query = `from:${senderEmail} is:unread`;
  
  if (keywords && keywords.length > 0) {
    query += ` subject:(${keywords.join(' OR ')})`;
  }

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 10
  });

  if (!response.data.messages || response.data.messages.length === 0) {
    return [];
  }

  const messages: GmailMessage[] = [];

  for (const message of response.data.messages) {
    if (!message.id) continue;

    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'full'
    });

    const headers = fullMessage.data.payload?.headers || [];
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
    const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
    const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';

    let body = '';
    if (fullMessage.data.payload?.parts) {
      const textPart = fullMessage.data.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    } else if (fullMessage.data.payload?.body?.data) {
      body = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
    }

    messages.push({
      id: message.id,
      threadId: fullMessage.data.threadId || '',
      from,
      to,
      subject,
      body,
      snippet: fullMessage.data.snippet || '',
      date,
      labelIds: fullMessage.data.labelIds || []
    });
  }

  return messages;
}

export async function sendEmail(
  tokens: GoogleTokens,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<void> {
  setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const email = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\n');

  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
      threadId: threadId
    }
  });
}

export async function markAsRead(tokens: GoogleTokens, messageId: string): Promise<void> {
  setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD']
    }
  });
}

// Calendar operations
export async function getCalendarEvents(
  tokens: GoogleTokens,
  daysAhead: number = 7
): Promise<CalendarEvent[]> {
  setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50
  });

  if (!response.data.items) {
    return [];
  }

  return response.data.items.map(event => ({
    summary: event.summary || 'No Title',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    description: event.description || undefined
  }));
}

export function formatCalendarEvents(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return 'No upcoming calendar events in the next 7 days.';
  }

  return events.map(event => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const dateStr = startDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const startTime = startDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    const endTime = endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    
    return `${dateStr}: ${event.summary} (${startTime} - ${endTime})`;
  }).join('\n');
}

// Token validation
export async function validateTokens(tokens: GoogleTokens): Promise<boolean> {
  try {
    setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    await oauth2.userinfo.get();
    return true;
  } catch {
    return false;
  }
}

// Get user email from tokens
export async function getUserEmail(tokens: GoogleTokens): Promise<string> {
  try {
    // Create a new OAuth2 client instance to avoid conflicts
    const authClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    console.log('🔧 getUserEmail - Token validation:', {
      access_token_length: tokens.access_token?.length,
      refresh_token_length: tokens.refresh_token?.length,
      expires_at: tokens.expires_at,
      is_expired: new Date(tokens.expires_at) <= new Date(),
      time_until_expiry: Math.round((new Date(tokens.expires_at).getTime() - Date.now()) / 1000 / 60) + ' minutes'
    });
    
    // Set credentials with proper token structure
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: new Date(tokens.expires_at).getTime(),
      // Add token type for proper header formatting
      token_type: 'Bearer'
    };
    
    authClient.setCredentials(credentials);
    
    console.log('🔧 getUserEmail - Credentials set, testing auth...');
    
    // Small delay to ensure token is properly set
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to refresh the token first to ensure it's valid
    try {
      console.log('🔧 getUserEmail - Checking token validity...');
      const tokenInfo = await authClient.getTokenInfo(tokens.access_token);
      console.log('🔧 getUserEmail - Token info:', {
        scopes: tokenInfo.scopes,
        expiry_date: tokenInfo.expiry_date,
        audience: tokenInfo.aud
      });
    } catch (tokenError: any) {
      console.log('🔧 getUserEmail - Token validation failed, trying refresh:', tokenError?.message);
      
      // Try to refresh the token
      const { credentials: refreshedCreds } = await authClient.refreshAccessToken();
      console.log('🔧 getUserEmail - Token refreshed successfully');
      authClient.setCredentials(refreshedCreds);
    }
    
    // Get user info with explicit auth
    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    console.log('🔧 getUserEmail - Making API call to userinfo.get()...');
    
    const response = await oauth2.userinfo.get({
      // Explicitly pass auth to ensure it's used
      auth: authClient
    });
    
    console.log('🔧 getUserEmail - API response:', {
      email: response.data.email,
      id: response.data.id,
      name: response.data.name
    });
    
    return response.data.email || '';
  } catch (error: any) {
    console.error('🔧 getUserEmail - Error details:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      response_status: error?.response?.status,
      response_data: error?.response?.data,
      request_headers: error?.config?.headers
    });
    throw error;
  }
}
