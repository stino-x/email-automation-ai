import { NextRequest, NextResponse } from 'next/server';
import { 
  getConfiguration, 
  getGoogleTokens,
  getAllCheckCounters
} from '@/lib/supabase/queries';
import { validateTokens } from '@/lib/google/auth';
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
          }
        });
        workerStatus = response.ok ? 'connected' : 'error';
      } catch {
        workerStatus = 'error';
      }
    }

    // Check Google tokens
    const googleTokens = await getGoogleTokens(userId);
    let gmailStatus: 'connected' | 'disconnected' = 'disconnected';
    let calendarStatus: 'connected' | 'disconnected' = 'disconnected';

    if (googleTokens) {
      const isValid = await validateTokens(googleTokens);
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

    return NextResponse.json({
      success: true,
      database: databaseStatus,
      worker: workerStatus,
      google_gmail: gmailStatus,
      google_calendar: calendarStatus,
      groq_api: groqStatus,
      check_counts: checkCounts
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
