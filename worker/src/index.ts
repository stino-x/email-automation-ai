import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import Groq from 'groq-sdk';
import { isInSchedule, getMaxChecksForPeriod, generateMonitorIdentifier, generatePeriodIdentifier } from './utils/scheduling';
import type { UserConfiguration, GoogleTokens, MonitoredEmail } from '../types';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Authentication middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
const activeMonitors = new Map<string, UserConfiguration>();

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
    const { user_id, configuration } = req.body as { 
      user_id: string;
      configuration: UserConfiguration;
    };

    // Update active monitors for this user
    activeMonitors.set(user_id, configuration);

    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
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
      activeMonitors.set(user_id, config);
      res.json({ success: true, message: 'Monitoring started' });
    } else {
      res.status(404).json({ error: 'Configuration not found' });
    }
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    console.error('Error resetting counters:', error);
    res.status(500).json({ error: 'Failed to reset counters' });
  }
});

// Email checking logic - Full implementation
async function checkEmails() {
  console.log('[CRON] Running email checks at', new Date().toISOString());

  for (const [userId, config] of activeMonitors.entries()) {
    if (!config.is_active) continue;

    console.log(`[USER ${userId}] Checking ${config.monitored_emails.length} monitors`);

    // Fetch Google tokens for this user
    const { data: tokens } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!tokens) {
      console.log(`[USER ${userId}] No Google tokens found, skipping`);
      continue;
    }

    // Check each monitored email
    for (const monitor of config.monitored_emails) {
      try {
        await checkSingleMonitor(userId, monitor, tokens, config.ai_prompt_template);
      } catch (error) {
        console.error(`[USER ${userId}] Error checking ${monitor.email_address}:`, error);
      }
    }
  }
}

async function checkSingleMonitor(
  userId: string,
  monitor: MonitoredEmail,
  tokens: GoogleTokens,
  promptTemplate: string
) {
  // 1. Check if current time is within schedule
  if (!isInSchedule(monitor)) {
    console.log(`[${monitor.email_address}] Not in schedule, skipping`);
    return;
  }

  // 2. Generate identifiers for tracking
  const monitorId = generateMonitorIdentifier(monitor.email_address, monitor.schedule);
  const periodId = generatePeriodIdentifier();

  // 3. Check count limits
  const { data: counter } = await supabase
    .from('check_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('monitor_identifier', monitorId)
    .eq('period_identifier', periodId)
    .single();

  const maxChecks = getMaxChecksForPeriod(monitor, periodId);
  const currentCount = counter?.current_count || 0;

  if (currentCount >= maxChecks) {
    console.log(`[${monitor.email_address}] Check limit reached (${currentCount}/${maxChecks})`);
    
    // Log limit reached
    await supabase.from('activity_logs').insert({
      user_id: userId,
      monitored_email: monitor.email_address,
      status: 'LIMIT_REACHED',
      check_number: currentCount,
      max_checks: maxChecks,
    });
    
    return;
  }

  // 4. Refresh access token if needed
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

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
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
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
      monitored_email: monitor.email_address,
      status: 'NO_EMAIL',
      check_number: currentCount + 1,
      max_checks: maxChecks,
    });
    
    return;
  }

  console.log(`[${monitor.email_address}] Found ${messages.messages.length} new email(s)`);

  // 6. Process each email
  for (const message of messages.messages) {
    try {
      // Check if already responded
      const { data: responded } = await supabase
        .from('responded_emails')
        .select('*')
        .eq('user_id', userId)
        .eq('email_id', message.id!)
        .single();

      if (responded) {
        console.log(`[${monitor.email_address}] Already responded to ${message.id}`);
        continue;
      }

      // Get full email details
      const { data: emailData } = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full',
      });

      if (!emailData) continue;

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
      } else if (emailData.payload?.body?.data) {
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
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const { data: events } = await calendar.events.list({
          calendarId: 'primary',
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

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.7,
        max_tokens: 1024,
      });

      const aiResponse = completion.choices[0]?.message?.content || '';

      if (!aiResponse) {
        console.log(`[${monitor.email_address}] No AI response generated`);
        continue;
      }

      console.log(`[${monitor.email_address}] AI response generated (${aiResponse.length} chars)`);

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
        id: message.id!,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      // 10. Log success
      await supabase.from('activity_logs').insert({
        user_id: userId,
        monitored_email: monitor.email_address,
        status: 'SENT',
        check_number: currentCount + 1,
        max_checks: maxChecks,
        email_from: from,
        email_subject: subject,
        ai_response: aiResponse.substring(0, 500), // Store first 500 chars
      });

      // 11. Mark as responded
      await supabase.from('responded_emails').insert({
        user_id: userId,
        email_id: message.id!,
        monitored_email: monitor.email_address,
        sender_email: senderEmail,
      });

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

    } catch (error) {
      console.error(`[${monitor.email_address}] Error processing email:`, error);
      
      await supabase.from('activity_logs').insert({
        user_id: userId,
        monitored_email: monitor.email_address,
        status: 'ERROR',
        check_number: currentCount + 1,
        max_checks: maxChecks,
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Increment counter
  await incrementCheckCounter(userId, monitorId, periodId, maxChecks);
}

async function incrementCheckCounter(
  userId: string,
  monitorId: string,
  periodId: string,
  maxChecks: number
) {
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
  } else {
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
cron.schedule('* * * * *', checkEmails);

// Start server
app.listen(PORT, () => {
  console.log(`✓ Worker service running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/worker/health`);
  console.log(`✓ Cron job scheduled to run every minute`);
});

export default app;
