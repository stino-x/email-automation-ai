import { NextRequest, NextResponse } from 'next/server';
import { getAllCheckCounters } from '@/lib/supabase/queries';
import type { GetCheckCountsResponse, CheckCountInfo } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, counts: [] } as GetCheckCountsResponse,
        { status: 401 }
      );
    }

    const counters = await getAllCheckCounters(userId);
    
    const counts: CheckCountInfo[] = counters.map(counter => ({
      sender_email: counter.monitor_identifier,
      period: counter.period_identifier,
      current_count: counter.current_count,
      max_count: counter.max_count,
      percentage: (counter.current_count / counter.max_count) * 100
    }));

    return NextResponse.json({
      success: true,
      counts
    } as GetCheckCountsResponse);

  } catch (error) {
    console.error('Error getting check counts:', error);
    return NextResponse.json(
      {
        success: false,
        counts: [],
        message: error instanceof Error ? error.message : 'Failed to get check counts'
      } as GetCheckCountsResponse,
      { status: 500 }
    );
  }
}
