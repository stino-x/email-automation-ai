import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/lib/supabase/queries';
import type { GetLogsResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, logs: [], total: 0, page: 1, limit: 50 } as GetLogsResponse,
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const email = searchParams.get('email') || undefined;

    const { logs, total } = await getActivityLogs(userId, {
      page,
      limit,
      startDate,
      endDate,
      email
    });

    return NextResponse.json({
      success: true,
      logs,
      total,
      page,
      limit
    } as GetLogsResponse);

  } catch (error) {
    console.error('Error getting logs:', error);
    return NextResponse.json(
      {
        success: false,
        logs: [],
        total: 0,
        page: 1,
        limit: 50,
        message: error instanceof Error ? error.message : 'Failed to get logs'
      } as GetLogsResponse,
      { status: 500 }
    );
  }
}
