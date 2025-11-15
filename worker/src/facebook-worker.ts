// Facebook Worker Integration
// Add this to your existing worker/src/index.ts

import { FacebookClient } from './lib/facebook/client';
import type { FacebookConfiguration, FacebookMonitor, FacebookMessage } from './types/facebook';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// In-memory store for active Facebook monitors
const activeFacebookMonitors = new Map<string, {
  config: FacebookConfiguration;
  client: FacebookClient;
}>();

// Facebook monitoring endpoints for Express server

/**
 * Start Facebook monitoring endpoint
 * POST /facebook/start
 */
async function startFacebookMonitoring(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Fetch user's Facebook configuration
    const { data: config } = await supabase
      .from('facebook_configurations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!config || !config.is_active) {
      return { success: false, message: 'Configuration not active or not found' };
    }

    // Fetch Facebook credentials
    const { data: credentials } = await supabase
      .from('facebook_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!credentials) {
      return { success: false, message: 'Facebook credentials not found' };
    }

    // Initialize Facebook client
    const fbClient = new FacebookClient(credentials.app_state);
    await fbClient.initialize();

    // Store active monitor
    activeFacebookMonitors.set(userId, {
      config,
      client: fbClient
    });

    // Start listening for messages
    fbClient.listenForMessages(
      (message: FacebookMessage) => handleFacebookMessage(userId, message),
      (error: Error) => console.error(`[FB ${userId}] Listen error:`, error)
    );

    console.log(`[FB ${userId}] Started monitoring ${config.monitors.length} conversations`);

    return { success: true, message: 'Facebook monitoring started' };
  } catch (error) {
    console.error('[Facebook] Error starting monitoring:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Stop Facebook monitoring endpoint
 * POST /facebook/stop
 */
async function stopFacebookMonitoring(userId: string): Promise<{ success: boolean; message: string }> {
  activeFacebookMonitors.delete(userId);
  return { success: true, message: 'Facebook monitoring stopped' };
}

/**
 * Handle incoming Facebook message
 */
async function handleFacebookMessage(userId: string, message: FacebookMessage): Promise<void> {
  const monitor = activeFacebookMonitors.get(userId);
  if (!monitor) return;

  const { config, client } = monitor;

  try {
    // Find matching monitor configuration
    const matchingMonitor = config.monitors.find((m: FacebookMonitor) => 
      m.thread_id === message.threadId && m.is_active
    );

    if (!matchingMonitor) return;

    // If monitoring specific person in group, check sender
    if (matchingMonitor.monitored_sender_id && 
        message.senderId !== matchingMonitor.monitored_sender_id) {
      console.log(`[FB ${userId}] Ignoring message from ${message.senderName} (not monitored sender)`);
      return;
    }

    // Check keywords if specified
    if (matchingMonitor.keywords && matchingMonitor.keywords.length > 0) {
      const hasKeyword = matchingMonitor.keywords.some((keyword: string) =>
        message.body.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (!hasKeyword) {
        await logFacebookActivity(userId, matchingMonitor, message, null, 'FILTERED');
        return;
      }
    }

    // Check if already responded to this message
    const { data: alreadyResponded } = await supabase
      .from('facebook_responded_messages')
      .select('*')
      .eq('message_id', message.messageId)
      .single();

    if (alreadyResponded) {
      console.log(`[FB ${userId}] Already responded to message ${message.messageId}`);
      return;
    }

    console.log(`[FB ${userId}] New message in ${matchingMonitor.thread_name} from ${message.senderName}`);

    // Generate AI response if auto-respond is enabled
    if (matchingMonitor.auto_respond) {
      const calendarId = config.calendar_id || 'primary';
      const aiResponse = await generateFacebookResponse(
        message.body,
        matchingMonitor.ai_prompt_template,
        userId,
        calendarId
      );

      // Send response
      await client.sendMessage(message.threadId, aiResponse);

      // Mark as read (optional)
      await client.markAsRead(message.threadId);

      // Log activity
      await logFacebookActivity(userId, matchingMonitor, message, aiResponse, 'RESPONDED');

      // Mark message as responded
      await supabase.from('facebook_responded_messages').insert({
        user_id: userId,
        message_id: message.messageId,
        thread_id: message.threadId
      });

      console.log(`[FB ${userId}] Responded to ${message.senderName} in ${matchingMonitor.thread_name}`);
    } else {
      // Just log without responding
      await logFacebookActivity(userId, matchingMonitor, message, null, 'NEW_MESSAGE');
    }

  } catch (error) {
    console.error(`[FB ${userId}] Error handling message:`, error);
    await logFacebookActivity(
      userId,
      null,
      message,
      null,
      'ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Generate AI response using Groq with optional calendar integration
 */
async function generateFacebookResponse(
  userMessage: string,
  promptTemplate: string,
  userId: string,
  calendarId: string = 'primary'
): Promise<string> {
  let finalPrompt = promptTemplate;
  let oauth2Client: import('google-auth-library').OAuth2Client | null = null;

  // Check if calendar is needed
  if (finalPrompt.includes('{CALENDAR_EVENTS}')) {
    try {
      // Fetch user's Google tokens
      const { data: tokenData } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (tokenData) {
        const { google } = await import('googleapis');
        oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const { data: events } = await calendar.events.list({
          calendarId,
          timeMin: now.toISOString(),
          timeMax: endDate.toISOString(),
          maxResults: 20,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const formattedEvents = (events.items || []).map(event => {
          const start = event.start?.dateTime || event.start?.date || '';
          const end = event.end?.dateTime || event.end?.date || '';
          return `- ${event.summary} (${start} to ${end})`;
        }).join('\n') || 'No upcoming calendar events.';

        finalPrompt = finalPrompt.replace(/\{CALENDAR_EVENTS\}/g, formattedEvents);
      } else {
        finalPrompt = finalPrompt.replace(/\{CALENDAR_EVENTS\}/g, 'Calendar not connected.');
      }
    } catch (error) {
      console.error('[Facebook] Calendar fetch error:', error);
      finalPrompt = finalPrompt.replace(/\{CALENDAR_EVENTS\}/g, 'Unable to fetch calendar.');
    }
  }

  // Enhanced prompt with calendar event creation instructions
  const enhancedPrompt = `${finalPrompt}

IMPORTANT: If the conversation involves scheduling or confirming an event/meeting, respond in JSON format:
{
  "response": "your message response text here",
  "create_event": {
    "summary": "Event title",
    "description": "Event description",
    "start_datetime": "2024-01-15T14:00:00Z",
    "end_datetime": "2024-01-15T15:00:00Z"
  }
}

If NO event needs to be created, respond with plain text (no JSON).`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: [
      {
        role: 'system',
        content: enhancedPrompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  const aiResponseRaw = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

  // Parse response - check if it's JSON with calendar event
  let aiResponse = aiResponseRaw;
  let calendarEvent: { summary: string; description?: string; start_datetime: string; end_datetime: string } | null = null;

  try {
    // Try to parse as JSON
    const jsonMatch = aiResponseRaw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.response && parsed.create_event) {
        aiResponse = parsed.response;
        calendarEvent = parsed.create_event;
        console.log(`[Facebook] Calendar event detected in response`);
      }
    }
  } catch {
    // Not JSON, treat as plain text response
  }

  // Create calendar event if requested and oauth client is available
  if (calendarEvent && oauth2Client) {
    const { createCalendarEvent } = await import('@/lib/utils/calendar');
    const result = await createCalendarEvent(oauth2Client, calendarId, {
      summary: calendarEvent.summary,
      description: calendarEvent.description,
      startDateTime: calendarEvent.start_datetime,
      endDateTime: calendarEvent.end_datetime,
    });

    if (result.success) {
      console.log(`[Facebook] ✅ Calendar event created: ${result.eventId}`);
      // Append event confirmation to response
      if (result.eventLink) {
        aiResponse += `\n\n📅 Event created: ${result.eventLink}`;
      }
    } else {
      console.error(`[Facebook] ❌ Failed to create calendar event: ${result.error}`);
    }
  }

  return aiResponse;
}

/**
 * Log Facebook activity
 */
async function logFacebookActivity(
  userId: string,
  monitor: FacebookMonitor | null,
  message: FacebookMessage,
  aiResponse: string | null,
  status: 'NEW_MESSAGE' | 'RESPONDED' | 'FILTERED' | 'ERROR',
  errorMessage?: string
): Promise<void> {
  await supabase.from('facebook_activity_logs').insert({
    user_id: userId,
    monitor_id: monitor?.id || message.threadId,
    thread_name: monitor?.thread_name || 'Unknown',
    sender_name: message.senderName,
    message_content: message.body,
    ai_response: aiResponse,
    response_sent: !!aiResponse,
    status,
    error_message: errorMessage
  });
}

// Export functions to add to Express routes
export {
  startFacebookMonitoring,
  stopFacebookMonitoring,
  activeFacebookMonitors
};

/*
 * Add these routes to your worker/src/index.ts Express server:
 * 
 * app.post('/facebook/start', authenticate, async (req, res) => {
 *   const { user_id } = req.body;
 *   const result = await startFacebookMonitoring(user_id);
 *   res.json(result);
 * });
 * 
 * app.post('/facebook/stop', authenticate, async (req, res) => {
 *   const { user_id } = req.body;
 *   const result = await stopFacebookMonitoring(user_id);
 *   res.json(result);
 * });
 */
