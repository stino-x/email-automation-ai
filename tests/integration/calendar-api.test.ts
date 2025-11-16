import { test, expect } from '@playwright/test';
import { google } from 'googleapis';

test.describe('Google Calendar API Integration', () => {
  let oauth2Client: any;
  let calendar: any;

  test.beforeAll(async () => {
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: process.env.TEST_GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.TEST_GOOGLE_REFRESH_TOKEN,
    });

    calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  });

  test('should connect to Calendar API successfully', async () => {
    const response = await calendar.calendarList.list();
    expect(response.status).toBe(200);
    expect(response.data.items).toBeTruthy();
  });

  test('should list available calendars', async () => {
    const response = await calendar.calendarList.list();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.items)).toBe(true);
    expect(response.data.items.length).toBeGreaterThan(0);
    
    // Primary calendar should exist
    const primaryCalendar = response.data.items.find((cal: any) => cal.primary);
    expect(primaryCalendar).toBeTruthy();
  });

  test('should get primary calendar details', async () => {
    const response = await calendar.calendars.get({
      calendarId: 'primary',
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id');
    expect(response.data).toHaveProperty('summary');
  });

  test('should retrieve upcoming events', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('items');
    expect(Array.isArray(response.data.items)).toBe(true);
  });

  test('should create a test event', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour

    const event = {
      summary: `Test Event ${Date.now()}`,
      description: 'This is a test event created by automated tests',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    expect(response.status).toBe(200);
    expect(response.data.id).toBeTruthy();
    expect(response.data.summary).toBe(event.summary);

    // Clean up - delete the test event
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: response.data.id,
    });
  });

  test('should update an existing event', async () => {
    // First create an event
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const createResponse = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: 'Original Summary',
        start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      },
    });

    const eventId = createResponse.data.id;

    // Update the event
    const updateResponse = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: {
        summary: 'Updated Summary',
        start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      },
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.summary).toBe('Updated Summary');

    // Clean up
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  });

  test('should delete an event', async () => {
    // Create event first
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const createResponse = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: 'Event to Delete',
        start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      },
    });

    const eventId = createResponse.data.id;

    // Delete the event
    const deleteResponse = await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    expect(deleteResponse.status).toBe(204);

    // Verify deletion
    try {
      await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(404);
    }
  });

  test('should check for busy times', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: futureDate.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.calendars).toHaveProperty('primary');
    expect(response.data.calendars.primary).toHaveProperty('busy');
  });

  test('should access custom calendar by ID', async () => {
    const customCalendarId = process.env.TEST_CALENDAR_ID;
    
    if (customCalendarId) {
      const response = await calendar.events.list({
        calendarId: customCalendarId,
        maxResults: 10,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
    }
  });

  test('should filter events by search query', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      q: 'meeting', // Search for events containing "meeting"
      singleEvents: true,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('items');
  });

  test('should retrieve events with attendees', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: 10,
    });

    expect(response.status).toBe(200);
    
    if (response.data.items && response.data.items.length > 0) {
      const event = response.data.items[0];
      expect(event).toHaveProperty('start');
      expect(event).toHaveProperty('end');
    }
  });

  test('should format calendar data for AI prompt', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
    });

    if (response.data.items && response.data.items.length > 0) {
      const formattedEvents = response.data.items.map((event: any) => {
        const start = event.start.dateTime || event.start.date;
        const end = event.end.dateTime || event.end.date;
        return `${event.summary}: ${start} to ${end}`;
      });

      expect(formattedEvents.length).toBeGreaterThan(0);
      expect(typeof formattedEvents[0]).toBe('string');
    }
  });

  test('should handle invalid calendar ID gracefully', async () => {
    try {
      await calendar.events.list({
        calendarId: 'invalid-calendar-id-12345',
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.code).toBe(404);
    }
  });
});
