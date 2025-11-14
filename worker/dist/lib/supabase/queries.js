"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateUser = getOrCreateUser;
exports.getUserById = getUserById;
exports.saveConfiguration = saveConfiguration;
exports.getConfiguration = getConfiguration;
exports.updateServiceStatus = updateServiceStatus;
exports.saveGoogleTokens = saveGoogleTokens;
exports.getGoogleTokens = getGoogleTokens;
exports.deleteGoogleTokens = deleteGoogleTokens;
exports.createActivityLog = createActivityLog;
exports.getActivityLogs = getActivityLogs;
exports.getRecentActivityLogs = getRecentActivityLogs;
exports.getCheckCounter = getCheckCounter;
exports.incrementCheckCounter = incrementCheckCounter;
exports.getAllCheckCounters = getAllCheckCounters;
exports.resetCheckCounters = resetCheckCounters;
exports.markEmailAsResponded = markEmailAsResponded;
exports.hasEmailBeenResponded = hasEmailBeenResponded;
exports.getEmailsProcessedToday = getEmailsProcessedToday;
exports.getEmailsProcessedThisWeek = getEmailsProcessedThisWeek;
const client_1 = require("./client");
const supabase = (0, client_1.getServerClient)();
// User operations
async function getOrCreateUser(email) {
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    if (existingUser) {
        return existingUser;
    }
    const { data: newUser, error } = await supabase
        .from('users')
        .insert({ email })
        .select()
        .single();
    if (error)
        throw error;
    return newUser;
}
async function getUserById(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (error)
        return null;
    return data;
}
// Configuration operations
async function saveConfiguration(userId, config) {
    const { data: existing } = await supabase
        .from('configurations')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (existing) {
        const { data, error } = await supabase
            .from('configurations')
            .update({
            monitored_emails: config.monitored_emails,
            ai_prompt_template: config.ai_prompt_template,
            is_active: config.is_active,
            max_emails_per_period: config.max_emails_per_period,
            once_per_window: config.once_per_window
        })
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    const { data, error } = await supabase
        .from('configurations')
        .insert({
        user_id: userId,
        ...config
    })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function getConfiguration(userId) {
    const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error)
        return null;
    return data;
}
async function updateServiceStatus(userId, isActive) {
    const { error } = await supabase
        .from('configurations')
        .update({ is_active: isActive })
        .eq('user_id', userId);
    if (error)
        throw error;
}
// Google tokens operations
async function saveGoogleTokens(tokens) {
    console.log('saveGoogleTokens called for user:', tokens.user_id);
    console.log('Google email:', tokens.google_email || 'not provided');
    // Use server client to bypass RLS
    const serverClient = (0, client_1.getServerClient)();
    // Check if tokens already exist for this user and google_email combination
    let existingQuery = serverClient
        .from('google_tokens')
        .select('*')
        .eq('user_id', tokens.user_id);
    // If google_email is provided (multi-account support), check for that specific account
    if (tokens.google_email) {
        existingQuery = existingQuery.eq('google_email', tokens.google_email);
    }
    const { data: existing, error: selectError } = await existingQuery.maybeSingle();
    console.log('Existing tokens found:', !!existing);
    if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking for existing tokens:', selectError);
    }
    if (existing) {
        console.log('Updating existing tokens...');
        const updateData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
            scopes: tokens.scopes,
            updated_at: new Date().toISOString()
        };
        // Only update google_email and account_label if provided
        if (tokens.google_email) {
            updateData.google_email = tokens.google_email;
        }
        if (tokens.account_label) {
            updateData.account_label = tokens.account_label;
        }
        let updateQuery = serverClient
            .from('google_tokens')
            .update(updateData)
            .eq('user_id', tokens.user_id);
        // Match on google_email if provided
        if (tokens.google_email) {
            updateQuery = updateQuery.eq('google_email', tokens.google_email);
        }
        const { error } = await updateQuery;
        if (error) {
            console.error('Error updating tokens:', error);
            throw error;
        }
        console.log('Tokens updated successfully');
    }
    else {
        console.log('Inserting new tokens...');
        const { error } = await serverClient
            .from('google_tokens')
            .insert(tokens);
        if (error) {
            console.error('Error inserting tokens:', error);
            throw error;
        }
        console.log('Tokens inserted successfully');
    }
}
async function getGoogleTokens(userId) {
    const { data, error } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error)
        return null;
    return data;
}
async function deleteGoogleTokens(userId) {
    const { error } = await supabase
        .from('google_tokens')
        .delete()
        .eq('user_id', userId);
    if (error)
        throw error;
}
// Activity logs operations
async function createActivityLog(log) {
    const { error } = await supabase
        .from('activity_logs')
        .insert(log);
    if (error)
        throw error;
}
async function getActivityLogs(userId, options) {
    const { page = 1, limit = 50, startDate, endDate, email } = options;
    const offset = (page - 1) * limit;
    let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);
    if (startDate) {
        query = query.gte('timestamp', startDate);
    }
    if (endDate) {
        query = query.lte('timestamp', endDate);
    }
    if (email) {
        query = query.eq('email_checked', email);
    }
    const { data, error, count } = await query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return {
        logs: data || [],
        total: count || 0
    };
}
async function getRecentActivityLogs(userId, limit = 10) {
    const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data || [];
}
// Check counter operations
async function getCheckCounter(userId, monitorIdentifier, periodIdentifier) {
    const { data, error } = await supabase
        .from('check_counters')
        .select('*')
        .eq('user_id', userId)
        .eq('monitor_identifier', monitorIdentifier)
        .eq('period_identifier', periodIdentifier)
        .single();
    if (error)
        return null;
    return data;
}
async function incrementCheckCounter(userId, monitorIdentifier, periodIdentifier, maxCount) {
    const existing = await getCheckCounter(userId, monitorIdentifier, periodIdentifier);
    if (existing) {
        const { data, error } = await supabase
            .from('check_counters')
            .update({
            current_count: existing.current_count + 1,
            last_check: new Date().toISOString()
        })
            .eq('id', existing.id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    const { data, error } = await supabase
        .from('check_counters')
        .insert({
        user_id: userId,
        monitor_identifier: monitorIdentifier,
        period_identifier: periodIdentifier,
        current_count: 1,
        max_count: maxCount,
        last_check: new Date().toISOString()
    })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function getAllCheckCounters(userId) {
    const { data, error } = await supabase
        .from('check_counters')
        .select('*')
        .eq('user_id', userId)
        .order('last_check', { ascending: false });
    if (error)
        throw error;
    return data || [];
}
async function resetCheckCounters(userId) {
    const { error } = await supabase
        .from('check_counters')
        .update({
        current_count: 0,
        last_reset: new Date().toISOString()
    })
        .eq('user_id', userId);
    if (error)
        throw error;
}
// Responded emails operations
async function markEmailAsResponded(userId, emailId, senderEmail, windowIdentifier) {
    const { error } = await supabase
        .from('responded_emails')
        .insert({
        user_id: userId,
        email_id: emailId,
        sender_email: senderEmail,
        window_identifier: windowIdentifier
    });
    if (error && !error.message.includes('duplicate')) {
        throw error;
    }
}
async function hasEmailBeenResponded(emailId, windowIdentifier) {
    const { data, error } = await supabase
        .from('responded_emails')
        .select('*')
        .eq('email_id', emailId)
        .eq('window_identifier', windowIdentifier)
        .single();
    if (error)
        return false;
    return !!data;
}
// Stats operations
async function getEmailsProcessedToday(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'SENT')
        .gte('timestamp', today.toISOString());
    if (error)
        return 0;
    return count || 0;
}
async function getEmailsProcessedThisWeek(userId) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count, error } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'SENT')
        .gte('timestamp', weekAgo.toISOString());
    if (error)
        return 0;
    return count || 0;
}
