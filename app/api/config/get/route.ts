import { NextRequest, NextResponse } from 'next/server';
import { getConfiguration } from '@/lib/supabase/queries';
import type { GetConfigResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' } as GetConfigResponse,
        { status: 401 }
      );
    }

    const configuration = await getConfiguration(userId);

    if (!configuration) {
      // Return default configuration if none exists
      return NextResponse.json({
        success: true,
        configuration: {
          user_id: userId,
          monitored_emails: [],
          ai_prompt_template: 'You are my personal assistant. Read this email and respond professionally.\n\nEmail from {SENDER_NAME} ({SENDER_EMAIL}):\nSubject: {EMAIL_SUBJECT}\n\n{EMAIL_CONTENT}\n\nPlease draft a response.',
          is_active: false,
          max_emails_per_period: 10,
          once_per_window: true
        }
      } as GetConfigResponse);
    }

    return NextResponse.json({
      success: true,
      configuration
    } as GetConfigResponse);

  } catch (error) {
    console.error('Error getting configuration:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get configuration'
      } as GetConfigResponse,
      { status: 500 }
    );
  }
}
