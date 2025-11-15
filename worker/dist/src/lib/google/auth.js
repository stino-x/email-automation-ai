"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthUrl = getAuthUrl;
exports.getTokensFromCode = getTokensFromCode;
exports.refreshAccessToken = refreshAccessToken;
exports.setCredentials = setCredentials;
exports.getUnreadEmails = getUnreadEmails;
exports.sendEmail = sendEmail;
exports.markAsRead = markAsRead;
exports.getCalendarEvents = getCalendarEvents;
exports.formatCalendarEvents = formatCalendarEvents;
exports.validateTokens = validateTokens;
exports.getUserEmail = getUserEmail;
const googleapis_1 = require("googleapis");
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify', // Needed to mark emails as read
    'https://www.googleapis.com/auth/calendar.readonly'
];
function getAuthUrl(state) {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        state: state
    });
}
async function getTokensFromCode(code) {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to get tokens from Google');
    }
    return {
        user_id: '', // Will be set by caller
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString(),
        scopes: tokens.scope ? tokens.scope.split(' ') : SCOPES
    };
}
async function refreshAccessToken(refreshToken) {
    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
    }
    return {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString()
    };
}
function setCredentials(tokens) {
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: new Date(tokens.expires_at).getTime()
    });
}
// Gmail operations
async function getUnreadEmails(tokens, senderEmail, keywords) {
    setCredentials(tokens);
    const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
    let query = `from:${senderEmail} is:unread`;
    if (keywords && keywords.length > 0) {
        query += ` subject:(${keywords.join(' OR ')})`;
    }
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
    });
    if (!response.data.messages || response.data.messages.length === 0) {
        return [];
    }
    const messages = [];
    for (const message of response.data.messages) {
        if (!message.id)
            continue;
        const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
        });
        const headers = fullMessage.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
        let body = '';
        if (fullMessage.data.payload?.parts) {
            const textPart = fullMessage.data.payload.parts.find(part => part.mimeType === 'text/plain');
            if (textPart?.body?.data) {
                body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
        }
        else if (fullMessage.data.payload?.body?.data) {
            body = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
        }
        messages.push({
            id: message.id,
            threadId: fullMessage.data.threadId || '',
            from,
            to,
            subject,
            body,
            snippet: fullMessage.data.snippet || '',
            date,
            labelIds: fullMessage.data.labelIds || []
        });
    }
    return messages;
}
async function sendEmail(tokens, to, subject, body, threadId) {
    setCredentials(tokens);
    const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
    const email = [
        `To: ${to}`,
        `Subject: Re: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
    ].join('\n');
    const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedEmail,
            threadId: threadId
        }
    });
}
async function markAsRead(tokens, messageId) {
    setCredentials(tokens);
    const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
    await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
            removeLabelIds: ['UNREAD']
        }
    });
}
// Calendar operations
async function getCalendarEvents(tokens, daysAhead = 7) {
    setCredentials(tokens);
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
    });
    if (!response.data.items) {
        return [];
    }
    return response.data.items.map(event => ({
        summary: event.summary || 'No Title',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        description: event.description || undefined
    }));
}
function formatCalendarEvents(events) {
    if (events.length === 0) {
        return 'No upcoming calendar events in the next 7 days.';
    }
    return events.map(event => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const dateStr = startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const startTime = startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        const endTime = endDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        return `${dateStr}: ${event.summary} (${startTime} - ${endTime})`;
    }).join('\n');
}
// Token validation
async function validateTokens(tokens) {
    try {
        setCredentials(tokens);
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        await oauth2.userinfo.get();
        return true;
    }
    catch {
        return false;
    }
}
// Get user email from tokens
async function getUserEmail(tokens) {
    setCredentials(tokens);
    const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
    const response = await oauth2.userinfo.get();
    return response.data.email || '';
}
