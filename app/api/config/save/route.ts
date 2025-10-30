import { NextRequest, NextResponse } from 'next/server';
import { saveConfiguration } from '@/lib/supabase/queries';
import { validateScheduleConfig } from '@/lib/utils/scheduling';
import type { SaveConfigRequest, SaveConfigResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: SaveConfigRequest = await request.json();
    const { configuration } = body;

    // Get user ID from header or session (simplified for now)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' } as SaveConfigResponse,
        { status: 401 }
      );
    }

    // Validate all monitored emails
    const validationErrors: string[] = [];
    configuration.monitored_emails.forEach((monitor, index) => {
      const validation = validateScheduleConfig(monitor);
      if (!validation.valid) {
        validationErrors.push(`Email ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Validation errors: ${validationErrors.join('; ')}`
        } as SaveConfigResponse,
        { status: 400 }
      );
    }

    // Save configuration
    const savedConfig = await saveConfiguration(userId, configuration);

    // Notify worker of configuration update
    if (process.env.WORKER_WEBHOOK_URL && process.env.WORKER_SECRET) {
      try {
        await fetch(`${process.env.WORKER_WEBHOOK_URL}/worker/config/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WORKER_SECRET}`
          },
          body: JSON.stringify({
            user_id: userId,
            configuration: savedConfig
          })
        });
      } catch (error) {
        console.error('Failed to notify worker:', error);
        // Don't fail the request if worker notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      configuration: savedConfig
    } as SaveConfigResponse);

  } catch (error) {
    console.error('Error saving configuration:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save configuration'
      } as SaveConfigResponse,
      { status: 500 }
    );
  }
}
