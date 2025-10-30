import { NextRequest, NextResponse } from 'next/server';
import { resetCheckCounters } from '@/lib/supabase/queries';
import type { ResetCountsResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' } as ResetCountsResponse,
        { status: 401 }
      );
    }

    await resetCheckCounters(userId);

    return NextResponse.json({
      success: true,
      message: 'Check counters reset successfully'
    } as ResetCountsResponse);

  } catch (error) {
    console.error('Error resetting counters:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset counters'
      } as ResetCountsResponse,
      { status: 500 }
    );
  }
}
