import { NextRequest, NextResponse } from 'next/server';
import { getConfiguration, getGoogleTokens } from '@/lib/supabase/queries';
import { getUnreadEmails } from '@/lib/google/auth';
import { generateAIResponse, shouldFetchCalendar } from '@/lib/groq/client';
import { getCalendarEvents, formatCalendarEvents } from '@/lib/google/auth';
import type { TestEmailResponse, PromptVariables } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' } as TestEmailResponse,
        { status: 401 }
      );
    }

    const configuration = await getConfiguration(userId);
    if (!configuration || configuration.monitored_emails.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No monitored emails configured'
      } as TestEmailResponse);
    }

    const googleTokens = await getGoogleTokens(userId);
    if (!googleTokens) {
      return NextResponse.json({
        success: false,
        message: 'Google account not connected'
      } as TestEmailResponse);
    }

    // Test with first monitored email
    const monitor = configuration.monitored_emails[0];
    const emails = await getUnreadEmails(
      googleTokens,
      monitor.sender_email,
      monitor.keywords
    );

    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new emails found to test with',
        would_send: false,
        reason: 'No unread emails from monitored sender'
      } as TestEmailResponse);
    }

    const email = emails[0];
    
    // Prepare prompt variables
    let calendarEvents = '';
    if (shouldFetchCalendar(configuration.ai_prompt_template)) {
      const events = await getCalendarEvents(googleTokens);
      calendarEvents = formatCalendarEvents(events);
    }

    const variables: PromptVariables = {
      EMAIL_CONTENT: email.body,
      SENDER_NAME: email.from.split('<')[0].trim(),
      SENDER_EMAIL: monitor.sender_email,
      CALENDAR_EVENTS: calendarEvents,
      CURRENT_DATE: new Date().toLocaleDateString(),
      EMAIL_SUBJECT: email.subject
    };

    // Generate AI response (but don't send)
    const { response: aiResponse } = await generateAIResponse(
      configuration.ai_prompt_template,
      variables
    );

    return NextResponse.json({
      success: true,
      message: 'Test completed successfully',
      ai_response: aiResponse,
      would_send: true,
      reason: `Would respond to: "${email.subject}" from ${monitor.sender_email}`
    } as TestEmailResponse);

  } catch (error) {
    console.error('Error testing email:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      } as TestEmailResponse,
      { status: 500 }
    );
  }
}
