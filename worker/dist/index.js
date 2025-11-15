"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_cron_1 = __importDefault(require("node-cron"));
const supabase_js_1 = require("@supabase/supabase-js");
const googleapis_1 = require("googleapis");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const scheduling_1 = require("./utils/scheduling");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Supabase client
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '');
// Groq client
const groq = new groq_sdk_1.default({
    apiKey: process.env.GROQ_API_KEY || '',
});
// Authentication middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    if (token !== process.env.WORKER_SECRET) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    next();
};
// In-memory store for active monitors
const activeMonitors = new Map();
// Helper function to transform database config to worker format
function transformDatabaseConfig(dbConfig) {
    // Safety check for monitored_emails
    if (!dbConfig.monitored_emails || !Array.isArray(dbConfig.monitored_emails)) {
        return {
            user_id: dbConfig.user_id,
            monitored_emails: [],
            ai_prompt_template: dbConfig.ai_prompt_template || '',
            is_active: true,
            max_emails_per_period: 10,
            once_per_window: true
        };
    }
    return {
        user_id: dbConfig.user_id,
        ai_prompt_template: dbConfig.ai_prompt_template || '',
        is_active: true,
        max_emails_per_period: 10,
        once_per_window: true,
        monitored_emails: dbConfig.monitored_emails
            .filter((monitor) => monitor !== null && monitor !== undefined)
            .map((monitor) => {
            const dayNameToNumber = (day) => {
                const dayMap = {
                    'sunday': 0,
                    'monday': 1,
                    'tuesday': 2,
                    'wednesday': 3,
                    'thursday': 4,
                    'friday': 5,
                    'saturday': 6
                };
                return dayMap[day.toLowerCase()] ?? 1;
            };
            let schedule;
            // Validate monitor has proper structure
            if (!monitor.sender_email) {
                console.warn('Monitor missing sender_email, skipping');
                return null;
            }
            if (monitor.schedule_type === 'recurring' && monitor.recurring_config) {
                schedule = {
                    type: 'recurring',
                    days_of_week: monitor.recurring_config.days?.map(dayNameToNumber) || [1, 2, 3, 4, 5],
                    time_window_start: monitor.recurring_config.start_time || '09:00',
                    time_window_end: monitor.recurring_config.end_time || '17:00',
                    check_interval_minutes: monitor.recurring_config.interval_minutes || 15,
                    max_checks_per_day: monitor.recurring_config.max_checks_per_day || 30
                };
            }
            else if (monitor.schedule_type === 'specific_dates' && monitor.specific_dates_config) {
                const config = monitor.specific_dates_config;
                schedule = {
                    type: 'specific_dates',
                    specific_dates: config.dates?.map((date) => ({
                        date,
                        time_window_start: config.start_time || '09:00',
                        time_window_end: config.end_time || '17:00',
                        check_interval_minutes: config.interval_minutes || 15,
                        max_checks: config.max_checks_per_date || 30
                    })) || []
                };
            }
            else {
                // Default recurring schedule
                schedule = {
                    type: 'recurring',
                    days_of_week: [1, 2, 3, 4, 5],
                    time_window_start: '09:00',
                    time_window_end: '17:00',
                    check_interval_minutes: 15,
                    max_checks_per_day: 30
                };
            }
            return {
                email_address: monitor.sender_email,
                sender_email: monitor.sender_email,
                keywords: monitor.keywords || [],
                schedule,
                stop_after_response: monitor.stop_after_response !== 'never',
                is_active: monitor.is_active ?? true, // Include is_active
                receiving_email: monitor.receiving_email, // Include receiving_email for multi-account support
                schedule_type: monitor.schedule_type,
                recurring_config: monitor.recurring_config,
                specific_dates_config: monitor.specific_dates_config
            };
        }).filter((m) => m !== null) // Remove null entries
    };
}
// Root endpoint for testing
app.get('/', (req, res) => {
    res.json({
        service: 'Email Automation Worker',
        status: 'running',
        version: '1.0.0',
        endpoints: ['/worker/health', '/worker/config/update', '/worker/start', '/worker/stop']
    });
});
// Health check endpoint
app.get('/worker/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        active_monitors: activeMonitors.size,
        timestamp: new Date().toISOString()
    });
});
// Configuration update endpoint
app.post('/worker/config/update', authenticate, async (req, res) => {
    try {
        const { user_id, configuration } = req.body;
        // Transform and update active monitors for this user
        const transformedConfig = transformDatabaseConfig(configuration);
        activeMonitors.set(user_id, transformedConfig);
        res.json({ success: true, message: 'Configuration updated' });
    }
    catch (error) {
        console.error('Error updating configuration:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});
// Start monitoring endpoint
app.post('/worker/start', authenticate, async (req, res) => {
    try {
        const { user_id } = req.body;
        // Fetch user configuration from database
        const { data: config } = await supabase
            .from('configurations')
            .select('*')
            .eq('user_id', user_id)
            .single();
        if (config) {
            // Transform and store the configuration
            const transformedConfig = transformDatabaseConfig(config);
            activeMonitors.set(user_id, transformedConfig);
            res.json({ success: true, message: 'Monitoring started' });
        }
        else {
            res.status(404).json({ error: 'Configuration not found' });
        }
    }
    catch (error) {
        console.error('Error starting monitoring:', error);
        res.status(500).json({ error: 'Failed to start monitoring' });
    }
});
// Stop monitoring endpoint
app.post('/worker/stop', authenticate, async (req, res) => {
    try {
        const { user_id } = req.body;
        activeMonitors.delete(user_id);
        res.json({ success: true, message: 'Monitoring stopped' });
    }
    catch (error) {
        console.error('Error stopping monitoring:', error);
        res.status(500).json({ error: 'Failed to stop monitoring' });
    }
});
// Manual trigger endpoint
app.post('/worker/trigger', authenticate, async (req, res) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user_id } = req.body;
        // Run check immediately for this user
        // TODO: Implement immediate check logic
        res.json({ success: true, message: 'Check triggered', checks_performed: 0 });
    }
    catch (error) {
        console.error('Error triggering check:', error);
        res.status(500).json({ error: 'Failed to trigger check' });
    }
});
// Get current check counts
app.get('/worker/counts', authenticate, async (req, res) => {
    try {
        const { data: counters } = await supabase
            .from('check_counters')
            .select('*')
            .order('last_check', { ascending: false })
            .limit(100);
        res.json({ success: true, counters: counters || [] });
    }
    catch (error) {
        console.error('Error getting counts:', error);
        res.status(500).json({ error: 'Failed to get counts' });
    }
});
// Reset check counters
app.post('/worker/reset-counts', authenticate, async (req, res) => {
    try {
        const { user_id } = req.body;
        await supabase
            .from('check_counters')
            .update({
            current_count: 0,
            last_reset: new Date().toISOString()
        })
            .eq('user_id', user_id);
        res.json({ success: true, message: 'Counters reset' });
    }
    catch (error) {
        console.error('Error resetting counters:', error);
        res.status(500).json({ error: 'Failed to reset counters' });
    }
});
// Email checking logic - Full implementation
async function checkEmails() {
    console.log('[CRON] Running email checks at', new Date().toISOString());
    for (const [userId, config] of activeMonitors.entries()) {
        // STRICT RULE 1: IMMEDIATELY respect pause toggle - check database EVERY TIME for real-time status
        const { data: dbConfig } = await supabase
            .from('configurations')
            .select('is_active, monitored_emails')
            .eq('user_id', userId)
            .single();
        if (!dbConfig || !dbConfig.is_active) {
            console.log(`[USER ${userId}] ⏸️  MONITORING PAUSED - Skipping all checks`);
            activeMonitors.delete(userId); // Clean up inactive monitors
            continue;
        }
        console.log(`[USER ${userId}] Checking ${config.monitored_emails.length} monitors`);
        // Group monitors by receiving_email to fetch appropriate tokens
        const monitorsByAccount = new Map();
        for (const monitor of config.monitored_emails) {
            const accountKey = monitor.receiving_email || null; // null = primary account
            if (!monitorsByAccount.has(accountKey)) {
                monitorsByAccount.set(accountKey, []);
            }
            monitorsByAccount.get(accountKey).push(monitor);
        }
        // Create a map of sender_email -> is_active from FRESH database config for INSTANT toggle response
        const freshStatusMap = new Map();
        if (dbConfig.monitored_emails && Array.isArray(dbConfig.monitored_emails)) {
            for (const dbMonitor of dbConfig.monitored_emails) {
                if (dbMonitor?.sender_email) {
                    freshStatusMap.set(dbMonitor.sender_email, dbMonitor.is_active ?? true);
                }
            }
        }
        // Process monitors for each Google account
        for (const [receivingEmail, monitorsForAccount] of monitorsByAccount) {
            // Fetch Google tokens for the specific account (or primary if null)
            let tokensQuery = supabase
                .from('google_tokens')
                .select('*')
                .eq('user_id', userId);
            if (receivingEmail) {
                // Fetch tokens for specific Google account
                tokensQuery = tokensQuery.eq('google_email', receivingEmail);
            }
            // If receivingEmail is null, fetch primary account (first one, or the one without google_email)
            // For backward compatibility, if google_email column doesn't exist, this will still work
            const { data: tokens } = await tokensQuery.single();
            if (!tokens) {
                console.log(`[USER ${userId}] No Google tokens found for account ${receivingEmail || 'primary'}, skipping ${monitorsForAccount.length} monitors`);
                continue;
            }
            console.log(`[USER ${userId}] Processing ${monitorsForAccount.length} monitors for account: ${receivingEmail || 'primary'}`);
            // Check each monitored email using transformed config + FRESH status from database
            for (const monitor of monitorsForAccount) {
                try {
                    // STRICT RULE 2: INSTANT individual monitor pause - check FRESH DB value every time
                    const isFreshActive = freshStatusMap.get(monitor.email_address) ?? true;
                    if (!isFreshActive) {
                        console.log(`[${monitor.email_address}] ⏸️ Monitor individually PAUSED (INSTANT from DB) - Skipping`);
                        continue;
                    }
                    await checkSingleMonitor(userId, monitor, tokens, config.ai_prompt_template, config.calendar_id);
                }
                catch (error) {
                    console.error(`[USER ${userId}] Error checking ${monitor.email_address}:`, error);
                }
            }
        }
    }
}
async function checkSingleMonitor(userId, monitor, tokens, promptTemplate, calendarId) {
    // 1. Check if current time is within schedule
    if (!(0, scheduling_1.isInSchedule)(monitor)) {
        console.log(`[${monitor.email_address}] Not in schedule, skipping`);
        return;
    }
    // 2. Generate identifiers for tracking
    const monitorId = (0, scheduling_1.generateMonitorIdentifier)(monitor.email_address, monitor.schedule);
    const periodId = (0, scheduling_1.generatePeriodIdentifier)();
    // 3. Check count limits
    const { data: counter } = await supabase
        .from('check_counters')
        .select('*')
        .eq('user_id', userId)
        .eq('monitor_identifier', monitorId)
        .eq('period_identifier', periodId)
        .single();
    const maxChecks = (0, scheduling_1.getMaxChecksForPeriod)(monitor, periodId);
    const currentCount = counter?.current_count || 0;
    if (currentCount >= maxChecks) {
        console.log(`[${monitor.email_address}] Check limit reached (${currentCount}/${maxChecks})`);
        // Log limit reached
        await supabase.from('activity_logs').insert({
            user_id: userId,
            email_checked: monitor.email_address,
            status: 'LIMIT_REACHED',
            check_number: currentCount,
            total_checks_allowed: maxChecks,
        });
        return;
    }
    // 4. Refresh access token if needed
    const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
    });
    // Check if token is expired
    const expiresAt = new Date(tokens.expires_at);
    if (expiresAt < new Date()) {
        console.log(`[${monitor.email_address}] Refreshing access token`);
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (credentials.access_token) {
            // Update tokens in database
            await supabase
                .from('google_tokens')
                .update({
                access_token: credentials.access_token,
                expires_at: new Date(Date.now() + (credentials.expiry_date || 3600000)).toISOString(),
            })
                .eq('user_id', userId);
            oauth2Client.setCredentials(credentials);
        }
    }
    // 5. Query Gmail for new emails
    const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
    let query = `from:${monitor.email_address} is:unread`;
    if (monitor.keywords && monitor.keywords.length > 0) {
        const keywordQuery = monitor.keywords.map(k => `"${k}"`).join(' OR ');
        query += ` (${keywordQuery})`;
    }
    const { data: messages } = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 5,
    });
    if (!messages.messages || messages.messages.length === 0) {
        console.log(`[${monitor.email_address}] No new emails`);
        // Increment counter and log
        await incrementCheckCounter(userId, monitorId, periodId, maxChecks);
        await supabase.from('activity_logs').insert({
            user_id: userId,
            email_checked: monitor.email_address,
            status: 'NO_EMAIL',
            check_number: currentCount + 1,
            total_checks_allowed: maxChecks,
        });
        return;
    }
    console.log(`[${monitor.email_address}] Found ${messages.messages.length} new email(s)`);
    // 6. Process each email
    for (const message of messages.messages) {
        try {
            // STRICT RULE 2: NEVER reply to the same email twice - check database
            const { data: responded } = await supabase
                .from('responded_emails')
                .select('*')
                .eq('user_id', userId)
                .eq('email_id', message.id)
                .maybeSingle();
            if (responded) {
                console.log(`[${monitor.email_address}] 🚫 ALREADY RESPONDED to email ${message.id} - Skipping to prevent duplicate reply`);
                continue;
            }
            // Get full email details
            const { data: emailData } = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'full',
            });
            if (!emailData)
                continue;
            // Parse email
            const headers = emailData.payload?.headers || [];
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || '';
            const senderName = from.split('<')[0].trim() || from;
            const senderEmail = from.match(/<(.+)>/)?.[1] || from;
            // Get email body
            let emailBody = '';
            if (emailData.payload?.parts) {
                const textPart = emailData.payload.parts.find(p => p.mimeType === 'text/plain');
                if (textPart?.body?.data) {
                    emailBody = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                }
            }
            else if (emailData.payload?.body?.data) {
                emailBody = Buffer.from(emailData.payload.body.data, 'base64').toString('utf-8');
            }
            console.log(`[${monitor.email_address}] Processing email from ${senderName}: "${subject}"`);
            // 7. Generate AI response
            let prompt = promptTemplate
                .replace(/\{SENDER_NAME\}/g, senderName)
                .replace(/\{SENDER_EMAIL\}/g, senderEmail)
                .replace(/\{EMAIL_CONTENT\}/g, emailBody)
                .replace(/\{EMAIL_SUBJECT\}/g, subject);
            // Check if calendar is needed
            if (prompt.includes('{CALENDAR_EVENTS}')) {
                const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                const now = new Date();
                const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
                // Use configured calendar_id or default to 'primary'
                const effectiveCalendarId = calendarId || 'primary';
                const { data: events } = await calendar.events.list({
                    calendarId: effectiveCalendarId,
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
                }).join('\n');
                prompt = prompt.replace(/\{CALENDAR_EVENTS\}/g, formattedEvents);
            }
            // Enhanced prompt with calendar event creation instructions
            const enhancedPrompt = `${prompt}

IMPORTANT: If the conversation involves scheduling or confirming an event/meeting, respond in JSON format:
{
  "response": "your email response text here",
  "create_event": {
    "summary": "Event title",
    "description": "Event description",
    "start_datetime": "2024-01-15T14:00:00Z",
    "end_datetime": "2024-01-15T15:00:00Z",
    "attendees": ["email@example.com"]
  }
}

If NO event needs to be created, respond with plain text (no JSON).

Examples:
- "Let's meet Tuesday at 2pm" → Create event
- "Thanks for your email" → Plain text
- "Can we schedule a call?" → Ask for time, don't create yet`;
            // Use model from env so we can rotate models without code changes
            const groqModel = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: enhancedPrompt }],
                model: groqModel,
                temperature: 0.7,
                max_tokens: 1024,
            });
            const aiResponseRaw = completion.choices[0]?.message?.content || '';
            if (!aiResponseRaw) {
                console.log(`[${monitor.email_address}] No AI response generated`);
                continue;
            }
            // Parse response - check if it's JSON with calendar event
            let aiResponse = aiResponseRaw;
            let calendarEvent = null;
            try {
                // Try to parse as JSON
                const jsonMatch = aiResponseRaw.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.response && parsed.create_event) {
                        aiResponse = parsed.response;
                        calendarEvent = parsed.create_event;
                        console.log(`[${monitor.email_address}] Calendar event detected in response`);
                    }
                }
            }
            catch {
                // Not JSON, treat as plain text response
            }
            console.log(`[${monitor.email_address}] AI response generated (${aiResponse.length} chars)`);
            // Create calendar event if requested
            if (calendarEvent && calendarId) {
                const { createCalendarEvent } = await Promise.resolve().then(() => __importStar(require('@/lib/utils/calendar')));
                const result = await createCalendarEvent(oauth2Client, calendarId, {
                    summary: calendarEvent.summary,
                    description: calendarEvent.description,
                    startDateTime: calendarEvent.start_datetime,
                    endDateTime: calendarEvent.end_datetime,
                    attendees: calendarEvent.attendees,
                });
                if (result.success) {
                    console.log(`[${monitor.email_address}] ✅ Calendar event created: ${result.eventId}`);
                    // Append event link to response
                    if (result.eventLink) {
                        aiResponse += `\n\n📅 Event created: ${result.eventLink}`;
                    }
                }
                else {
                    console.error(`[${monitor.email_address}] ❌ Failed to create calendar event: ${result.error}`);
                }
            }
            // 8. Send email response
            const rawEmail = [
                `To: ${senderEmail}`,
                `Subject: Re: ${subject}`,
                'Content-Type: text/plain; charset=utf-8',
                '',
                aiResponse,
            ].join('\n');
            const encodedEmail = Buffer.from(rawEmail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedEmail,
                    threadId: emailData.threadId,
                },
            });
            console.log(`[${monitor.email_address}] Response sent to ${senderEmail}`);
            // 9. Mark original email as read
            await gmail.users.messages.modify({
                userId: 'me',
                id: message.id,
                requestBody: {
                    removeLabelIds: ['UNREAD'],
                },
            });
            // 10. Log success
            await supabase.from('activity_logs').insert({
                user_id: userId,
                email_checked: monitor.email_address,
                status: 'SENT',
                check_number: currentCount + 1,
                total_checks_allowed: maxChecks,
                email_subject: `From: ${from} | ${subject}`,
                email_content: emailBody?.substring(0, 500),
                ai_response: aiResponse.substring(0, 500), // Store first 500 chars
            });
            // 11. Mark as responded - STRICT: Track to prevent duplicate replies
            const windowId = (0, scheduling_1.generatePeriodIdentifier)();
            await supabase.from('responded_emails').insert({
                user_id: userId,
                email_id: message.id,
                monitored_email: monitor.email_address,
                sender_email: senderEmail,
                window_identifier: windowId,
            });
            console.log(`[${monitor.email_address}] ✅ Marked email ${message.id} as responded - Will NEVER reply again`);
            // 12. Check stop-after-response
            if (monitor.stop_after_response) {
                console.log(`[${monitor.email_address}] Stop-after-response enabled, stopping monitor`);
                // Remove from active monitors
                const config = activeMonitors.get(userId);
                if (config) {
                    config.monitored_emails = config.monitored_emails.filter(m => m.email_address !== monitor.email_address);
                    activeMonitors.set(userId, config);
                }
                break;
            }
        }
        catch (error) {
            console.error(`[${monitor.email_address}] Error processing email:`, error);
            await supabase.from('activity_logs').insert({
                user_id: userId,
                email_checked: monitor.email_address,
                status: 'ERROR',
                check_number: currentCount + 1,
                total_checks_allowed: maxChecks,
                error_message: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Increment counter
    await incrementCheckCounter(userId, monitorId, periodId, maxChecks);
}
async function incrementCheckCounter(userId, monitorId, periodId, maxChecks) {
    const { data: existing } = await supabase
        .from('check_counters')
        .select('*')
        .eq('user_id', userId)
        .eq('monitor_identifier', monitorId)
        .eq('period_identifier', periodId)
        .single();
    if (existing) {
        await supabase
            .from('check_counters')
            .update({
            current_count: existing.current_count + 1,
            last_check: new Date().toISOString(),
        })
            .eq('id', existing.id);
    }
    else {
        await supabase.from('check_counters').insert({
            user_id: userId,
            monitor_identifier: monitorId,
            period_identifier: periodId,
            current_count: 1,
            max_count: maxChecks,
            last_check: new Date().toISOString(),
        });
    }
}
// Schedule email checks every minute
node_cron_1.default.schedule('* * * * *', checkEmails);
// Load active configurations from database on startup
async function loadActiveConfigurations() {
    try {
        console.log('[STARTUP] Loading active configurations from database...');
        const { data: configs, error } = await supabase
            .from('configurations')
            .select('*')
            .eq('is_active', true);
        if (error) {
            console.error('[STARTUP] Error loading configurations:', error);
            return;
        }
        if (!configs || configs.length === 0) {
            console.log('[STARTUP] No active configurations found');
            return;
        }
        for (const config of configs) {
            const transformedConfig = transformDatabaseConfig(config);
            activeMonitors.set(config.user_id, transformedConfig);
            console.log(`[STARTUP] Loaded config for user ${config.user_id} with ${transformedConfig.monitored_emails.length} monitors`);
        }
        console.log(`[STARTUP] Loaded ${configs.length} active configuration(s)`);
    }
    catch (error) {
        console.error('[STARTUP] Failed to load configurations:', error);
    }
}
// Load configurations on startup
loadActiveConfigurations();
// Log all registered routes before starting server
console.log('=== Registered Routes ===');
const router = app._router;
if (router?.stack) {
    router.stack.forEach((middleware) => {
        const route = middleware.route;
        if (route) {
            const [method] = Object.keys(route.methods);
            console.log(`${method?.toUpperCase() ?? 'UNKNOWN'} ${route.path}`);
        }
    });
}
else {
    console.log('No routes registered yet.');
}
console.log('========================');
// Start server
app.listen(PORT, () => {
    console.log(`✓ Worker service running on port ${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/worker/health`);
    console.log(`✓ Root endpoint: http://localhost:${PORT}/`);
    console.log(`✓ Cron job scheduled to run every minute`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});
exports.default = app;
