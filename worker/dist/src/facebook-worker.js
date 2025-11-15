"use strict";
// Facebook Worker Integration
// Add this to your existing worker/src/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeFacebookMonitors = void 0;
exports.startFacebookMonitoring = startFacebookMonitoring;
exports.stopFacebookMonitoring = stopFacebookMonitoring;
const client_1 = require("./lib/facebook/client");
const supabase_js_1 = require("@supabase/supabase-js");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
// Initialize clients
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '');
const groq = new groq_sdk_1.default({
    apiKey: process.env.GROQ_API_KEY || '',
});
// In-memory store for active Facebook monitors
const activeFacebookMonitors = new Map();
exports.activeFacebookMonitors = activeFacebookMonitors;
// Facebook monitoring endpoints for Express server
/**
 * Start Facebook monitoring endpoint
 * POST /facebook/start
 */
async function startFacebookMonitoring(userId) {
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
        const fbClient = new client_1.FacebookClient(credentials.app_state);
        await fbClient.initialize();
        // Store active monitor
        activeFacebookMonitors.set(userId, {
            config,
            client: fbClient
        });
        // Start listening for messages
        fbClient.listenForMessages((message) => handleFacebookMessage(userId, message), (error) => console.error(`[FB ${userId}] Listen error:`, error));
        console.log(`[FB ${userId}] Started monitoring ${config.monitors.length} conversations`);
        return { success: true, message: 'Facebook monitoring started' };
    }
    catch (error) {
        console.error('[Facebook] Error starting monitoring:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
}
/**
 * Stop Facebook monitoring endpoint
 * POST /facebook/stop
 */
async function stopFacebookMonitoring(userId) {
    activeFacebookMonitors.delete(userId);
    return { success: true, message: 'Facebook monitoring stopped' };
}
/**
 * Handle incoming Facebook message
 */
async function handleFacebookMessage(userId, message) {
    const monitor = activeFacebookMonitors.get(userId);
    if (!monitor)
        return;
    const { config, client } = monitor;
    try {
        // Find matching monitor configuration
        const matchingMonitor = config.monitors.find((m) => m.thread_id === message.threadId && m.is_active);
        if (!matchingMonitor)
            return;
        // If monitoring specific person in group, check sender
        if (matchingMonitor.monitored_sender_id &&
            message.senderId !== matchingMonitor.monitored_sender_id) {
            console.log(`[FB ${userId}] Ignoring message from ${message.senderName} (not monitored sender)`);
            return;
        }
        // Check keywords if specified
        if (matchingMonitor.keywords && matchingMonitor.keywords.length > 0) {
            const hasKeyword = matchingMonitor.keywords.some((keyword) => message.body.toLowerCase().includes(keyword.toLowerCase()));
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
            const aiResponse = await generateFacebookResponse(message.body, matchingMonitor.ai_prompt_template);
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
        }
        else {
            // Just log without responding
            await logFacebookActivity(userId, matchingMonitor, message, null, 'NEW_MESSAGE');
        }
    }
    catch (error) {
        console.error(`[FB ${userId}] Error handling message:`, error);
        await logFacebookActivity(userId, null, message, null, 'ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
}
/**
 * Generate AI response using Groq
 */
async function generateFacebookResponse(userMessage, promptTemplate) {
    const completion = await groq.chat.completions.create({
        model: 'llama-3.1-70b-versatile',
        messages: [
            {
                role: 'system',
                content: promptTemplate
            },
            {
                role: 'user',
                content: userMessage
            }
        ],
        temperature: 0.7,
        max_tokens: 500
    });
    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
}
/**
 * Log Facebook activity
 */
async function logFacebookActivity(userId, monitor, message, aiResponse, status, errorMessage) {
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
