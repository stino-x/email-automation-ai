import { google } from 'googleapis';

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601 format
  endDateTime: string; // ISO 8601 format
  timeZone?: string;
  attendees?: string[]; // Email addresses
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  error?: string;
}

/**
 * Create a new event in Google Calendar
 */
export async function createCalendarEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oauth2Client: any,
  calendarId: string,
  eventData: CalendarEventInput
): Promise<CalendarEventResult> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventData.summary,
      description: eventData.description,
      start: {
        dateTime: eventData.startDateTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      attendees: eventData.attendees?.map(email => ({ email })),
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return {
      success: true,
      eventId: response.data.id || undefined,
      eventLink: response.data.htmlLink || undefined,
    };
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a time slot has conflicts with existing events
 */
export async function checkTimeSlotAvailability(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oauth2Client: any,
  calendarId: string,
  startDateTime: string,
  endDateTime: string
): Promise<{ available: boolean; conflictingEvents: Array<{ summary: string; start: string; end: string }> }> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId,
      timeMin: startDateTime,
      timeMax: endDateTime,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    if (events.length === 0) {
      return { available: true, conflictingEvents: [] };
    }

    const conflictingEvents = events.map(event => ({
      summary: event.summary || 'Untitled Event',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
    }));

    return {
      available: false,
      conflictingEvents,
    };
  } catch (error) {
    console.error('Failed to check calendar availability:', error);
    return { available: false, conflictingEvents: [] };
  }
}

/**
 * Parse natural language date/time to ISO format
 * This is a simple implementation - you may want to use a library like chrono-node for better parsing
 */
export function parseDateTime(dateTimeString: string): string {
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toISOString();
  } catch {
    // Fallback: return current time + 1 hour
    return new Date(Date.now() + 3600000).toISOString();
  }
}
