// Supabase queries for Facebook monitoring
import { getServerClient } from '../supabase/client';
import type {
  FacebookConfiguration,
  FacebookActivityLog,
  FacebookCredentials,
  FacebookMonitor
} from '@/types/facebook';

const supabase = getServerClient();

// Facebook Configuration operations
export async function getFacebookConfiguration(userId: string): Promise<FacebookConfiguration | null> {
  const { data, error } = await supabase
    .from('facebook_configurations')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function saveFacebookConfiguration(
  userId: string,
  config: Omit<FacebookConfiguration, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<FacebookConfiguration> {
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

    if (error) throw error;
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

  if (error) throw error;
  return data;
}

export async function updateFacebookServiceStatus(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('facebook_configurations')
    .update({ is_active: isActive })
    .eq('user_id', userId);

  if (error) throw error;
}

// Facebook Credentials operations
export async function saveFacebookCredentials(
  userId: string,
  appState: string,
  expiresAt?: string
): Promise<FacebookCredentials> {
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

    if (error) throw error;
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

  if (error) throw error;
  return data;
}

export async function getFacebookCredentials(userId: string): Promise<FacebookCredentials | null> {
  const { data, error } = await supabase
    .from('facebook_credentials')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function deleteFacebookCredentials(userId: string): Promise<void> {
  const { error } = await supabase
    .from('facebook_credentials')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

// Facebook Activity Logs operations
export async function getFacebookActivityLogs(
  userId: string,
  limit: number = 100
): Promise<FacebookActivityLog[]> {
  const { data, error } = await supabase
    .from('facebook_activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createFacebookActivityLog(
  log: Omit<FacebookActivityLog, 'id' | 'timestamp'>
): Promise<void> {
  const { error } = await supabase
    .from('facebook_activity_logs')
    .insert(log);

  if (error) throw error;
}

// Facebook Responded Messages operations
export async function hasRespondedToMessage(
  userId: string,
  messageId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('facebook_responded_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('message_id', messageId)
    .single();

  return !!data;
}

export async function markMessageAsResponded(
  userId: string,
  messageId: string,
  threadId: string
): Promise<void> {
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
