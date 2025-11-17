import { NextRequest, NextResponse } from 'next/server';
import { 
  getConfiguration, 
  getGoogleTokens,
  getAllGoogleTokens,
  getAllCheckCounters
} from '@/lib/supabase/queries';
import type { StatusResponse, CheckCountInfo } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, database: 'error', worker: 'error', google_gmail: 'disconnected', google_calendar: 'disconnected', groq_api: 'missing' } as StatusResponse,
        { status: 401 }
      );
    }

    // Check database connection
    let databaseStatus: 'connected' | 'disconnected' | 'error' = 'connected';
    try {
      await getConfiguration(userId);
    } catch {
      databaseStatus = 'error';
    }

    // Check worker status
    let workerStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    if (process.env.WORKER_WEBHOOK_URL && process.env.WORKER_SECRET) {
      try {
        const response = await fetch(`${process.env.WORKER_WEBHOOK_URL}/worker/health`, {
          headers: {
            'Authorization': `Bearer ${process.env.WORKER_SECRET}`
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        workerStatus = response.ok ? 'connected' : 'disconnected';
      } catch {
        // If it's a timeout or network error, mark as disconnected not error
        workerStatus = 'disconnected';
      }
    }

    // Check Google tokens
    const googleTokens = await getGoogleTokens(userId);
    let gmailStatus: 'connected' | 'disconnected' = 'disconnected';
    let calendarStatus: 'connected' | 'disconnected' = 'disconnected';

    if (googleTokens) {
      // Check if token hasn't expired
      const isValid = new Date(googleTokens.expires_at) > new Date();
      
      if (isValid && googleTokens.scopes.includes('https://www.googleapis.com/auth/gmail.readonly')) {
        gmailStatus = 'connected';
      }
      if (isValid && googleTokens.scopes.includes('https://www.googleapis.com/auth/calendar.readonly')) {
        calendarStatus = 'connected';
      }
    }

    // Check Groq API
    let groqStatus: 'valid' | 'invalid' | 'missing' = 'missing';
    if (process.env.GROQ_API_KEY) {
      groqStatus = 'valid'; // Simplified check
    }

    // Get check counts
    const counters = await getAllCheckCounters(userId);
    const checkCounts: CheckCountInfo[] = counters.slice(0, 10).map(counter => ({
      sender_email: counter.monitor_identifier,
      period: counter.period_identifier,
      current_count: counter.current_count,
      max_count: counter.max_count,
      percentage: (counter.current_count / counter.max_count) * 100
    }));

    // Get all connected Google accounts
    const allGoogleAccounts = await getAllGoogleTokens(userId);
    const googleAccounts = await Promise.all(allGoogleAccounts.map(async (token, index) => {
      let isValid = true;
      
      try {
        // Check if token is expired and needs refresh
        const isExpired = new Date(token.expires_at) <= new Date();
        
        if (isExpired && token.refresh_token) {
          console.log(`🔄 Token for ${token.google_email} is expired, attempting refresh...`);
          
          // Import refresh function
          const { refreshTokens } = await import('@/lib/google/auth');
          await refreshTokens(token);
          console.log(`✅ Token refreshed successfully for ${token.google_email}`);
        }
        
        // If no refresh token and expired, mark as invalid
        if (isExpired && !token.refresh_token) {
          isValid = false;
          console.log(`❌ Token for ${token.google_email} is expired with no refresh token`);
        }
      } catch (error) {
        console.error(`❌ Failed to validate/refresh token for ${token.google_email}:`, error);
        isValid = false;
      }
      
      return {
        email: token.google_email || 'Unknown Email',
        is_valid: isValid,
        created_at: token.created_at,
        account_label: token.google_email ? `Account (${token.google_email})` : (index === 0 ? 'Primary Account' : `Account ${index + 1}`)
      };
    }));

    return NextResponse.json({
      success: true,
      database: databaseStatus,
      worker: workerStatus,
      google_gmail: gmailStatus,
      google_calendar: calendarStatus,
      groq_api: groqStatus,
      check_counts: checkCounts,
      google_accounts: googleAccounts
    } as StatusResponse);

  } catch (error) {
    console.error('Error getting status:', error);
    return NextResponse.json(
      {
        success: false,
        database: 'error',
        worker: 'error',
        google_gmail: 'disconnected',
        google_calendar: 'disconnected',
        groq_api: 'missing',
        message: error instanceof Error ? error.message : 'Failed to get status'
      } as StatusResponse,
      { status: 500 }
    );
  }
}
