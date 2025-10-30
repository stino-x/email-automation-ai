import { NextRequest, NextResponse } from 'next/server';
import { updateServiceStatus } from '@/lib/supabase/queries';
import type { ServiceStatusResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', is_active: false } as ServiceStatusResponse,
        { status: 401 }
      );
    }

    await updateServiceStatus(userId, false);

    // Notify worker to stop monitoring
    if (process.env.WORKER_WEBHOOK_URL && process.env.WORKER_SECRET) {
      try {
        await fetch(`${process.env.WORKER_WEBHOOK_URL}/worker/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WORKER_SECRET}`
          },
          body: JSON.stringify({ user_id: userId })
        });
      } catch (error) {
        console.error('Failed to notify worker:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Service stopped successfully',
      is_active: false
    } as ServiceStatusResponse);

  } catch (error) {
    console.error('Error stopping service:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop service',
        is_active: false
      } as ServiceStatusResponse,
      { status: 500 }
    );
  }
}
