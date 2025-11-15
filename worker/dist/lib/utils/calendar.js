"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCalendarEvent = createCalendarEvent;
exports.checkTimeSlotAvailability = checkTimeSlotAvailability;
exports.parseDateTime = parseDateTime;
const googleapis_1 = require("googleapis");
/**
 * Create a new event in Google Calendar
 */
async function createCalendarEvent(oauth2Client, calendarId, eventData) {
    try {
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
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
            eventId: response.data.id,
            eventLink: response.data.htmlLink,
        };
    }
    catch (error) {
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
async function checkTimeSlotAvailability(oauth2Client, calendarId, startDateTime, endDateTime) {
    try {
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
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
    }
    catch (error) {
        console.error('Failed to check calendar availability:', error);
        return { available: false, conflictingEvents: [] };
    }
}
/**
 * Parse natural language date/time to ISO format
 * This is a simple implementation - you may want to use a library like chrono-node for better parsing
 */
function parseDateTime(dateTimeString) {
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }
        return date.toISOString();
    }
    catch {
        // Fallback: return current time + 1 hour
        return new Date(Date.now() + 3600000).toISOString();
    }
}
