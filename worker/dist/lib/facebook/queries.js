"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFacebookConfiguration = getFacebookConfiguration;
exports.saveFacebookConfiguration = saveFacebookConfiguration;
exports.updateFacebookServiceStatus = updateFacebookServiceStatus;
exports.saveFacebookCredentials = saveFacebookCredentials;
exports.getFacebookCredentials = getFacebookCredentials;
exports.deleteFacebookCredentials = deleteFacebookCredentials;
exports.getFacebookActivityLogs = getFacebookActivityLogs;
exports.createFacebookActivityLog = createFacebookActivityLog;
exports.hasRespondedToMessage = hasRespondedToMessage;
exports.markMessageAsResponded = markMessageAsResponded;
// Supabase queries for Facebook monitoring
const client_1 = require("../supabase/client");
const supabase = (0, client_1.getServerClient)();
// Facebook Configuration operations
async function getFacebookConfiguration(userId) {
    const { data, error } = await supabase
        .from('facebook_configurations')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error)
        return null;
    return data;
}
async function saveFacebookConfiguration(userId, config) {
    const { data: existing } = await supabase
        .from('facebook_configurations')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (existing) {
        const { data, error } = await supabase
            .from('facebook_configurations')
            .update({
            monitors: config.monitors,
            default_prompt_template: config.default_prompt_template,
            check_interval_seconds: config.check_interval_seconds,
            is_active: config.is_active
        })
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    const { data, error } = await supabase
        .from('facebook_configurations')
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
async function updateFacebookServiceStatus(userId, isActive) {
    const { error } = await supabase
        .from('facebook_configurations')
        .update({ is_active: isActive })
        .eq('user_id', userId);
    if (error)
        throw error;
}
// Facebook Credentials operations
async function saveFacebookCredentials(userId, appState, expiresAt) {
    const { data: existing } = await supabase
        .from('facebook_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (existing) {
        const { data, error } = await supabase
            .from('facebook_credentials')
            .update({
            app_state: appState,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
        })
            .eq('user_id', userId)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    const { data, error } = await supabase
        .from('facebook_credentials')
        .insert({
        user_id: userId,
        app_state: appState,
        expires_at: expiresAt
    })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function getFacebookCredentials(userId) {
    const { data, error } = await supabase
        .from('facebook_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error)
        return null;
    return data;
}
async function deleteFacebookCredentials(userId) {
    const { error } = await supabase
        .from('facebook_credentials')
        .delete()
        .eq('user_id', userId);
    if (error)
        throw error;
}
// Facebook Activity Logs operations
async function getFacebookActivityLogs(userId, limit = 100) {
    const { data, error } = await supabase
        .from('facebook_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data || [];
}
async function createFacebookActivityLog(log) {
    const { error } = await supabase
        .from('facebook_activity_logs')
        .insert(log);
    if (error)
        throw error;
}
// Facebook Responded Messages operations
async function hasRespondedToMessage(userId, messageId) {
    const { data } = await supabase
        .from('facebook_responded_messages')
        .select('id')
        .eq('user_id', userId)
        .eq('message_id', messageId)
        .single();
    return !!data;
}
async function markMessageAsResponded(userId, messageId, threadId) {
    const { error } = await supabase
        .from('facebook_responded_messages')
        .insert({
        user_id: userId,
        message_id: messageId,
        thread_id: threadId
    });
    if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error;
    }
}
