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

    await updateServiceStatus(userId, true);

    // Notify worker to start monitoring
    if (process.env.WORKER_WEBHOOK_URL && process.env.WORKER_SECRET) {
      try {
        await fetch(`${process.env.WORKER_WEBHOOK_URL}/worker/start`, {
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
      message: 'Service started successfully',
      is_active: true
    } as ServiceStatusResponse);

  } catch (error) {
    console.error('Error starting service:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start service',
        is_active: false
      } as ServiceStatusResponse,
      { status: 500 }
    );
  }
}
