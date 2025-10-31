import { getServerClient } from './client';
import type {
  UserConfiguration,
  ActivityLog,
  GoogleTokens,
  CheckCounter,
  User
} from '@/types';

const supabase = getServerClient();

// User operations
export async function getOrCreateUser(email: string): Promise<User> {
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

  if (error) throw error;
  return newUser;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

// Configuration operations
export async function saveConfiguration(
  userId: string,
  config: Omit<UserConfiguration, 'id' | 'user_id' | 'updated_at'>
): Promise<UserConfiguration> {
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

    if (error) throw error;
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

  if (error) throw error;
  return data;
}

export async function getConfiguration(userId: string): Promise<UserConfiguration | null> {
  const { data, error } = await supabase
    .from('configurations')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function updateServiceStatus(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('configurations')
    .update({ is_active: isActive })
    .eq('user_id', userId);

  if (error) throw error;
}

// Google tokens operations
export async function saveGoogleTokens(tokens: Omit<GoogleTokens, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  console.log('saveGoogleTokens called for user:', tokens.user_id);
  
  const { data: existing, error: selectError } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', tokens.user_id)
    .single();

  console.log('Existing tokens found:', !!existing);
  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Error checking for existing tokens:', selectError);
  }

  if (existing) {
    console.log('Updating existing tokens...');
    const { error } = await supabase
      .from('google_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        scopes: tokens.scopes
      })
      .eq('user_id', tokens.user_id);

    if (error) {
      console.error('Error updating tokens:', error);
      throw error;
    }
    console.log('Tokens updated successfully');
  } else {
    console.log('Inserting new tokens...');
    const { error } = await supabase
      .from('google_tokens')
      .insert(tokens);

    if (error) {
      console.error('Error inserting tokens:', error);
      throw error;
    }
    console.log('Tokens inserted successfully');
  }
}

export async function getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function deleteGoogleTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from('google_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

// Activity logs operations
export async function createActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
  const { error } = await supabase
    .from('activity_logs')
    .insert(log);

  if (error) throw error;
}

export async function getActivityLogs(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    email?: string;
  }
): Promise<{ logs: ActivityLog[]; total: number }> {
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

  if (error) throw error;

  return {
    logs: data || [],
    total: count || 0
  };
}

export async function getRecentActivityLogs(userId: string, limit: number = 10): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Check counter operations
export async function getCheckCounter(
  userId: string,
  monitorIdentifier: string,
  periodIdentifier: string
): Promise<CheckCounter | null> {
  const { data, error } = await supabase
    .from('check_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('monitor_identifier', monitorIdentifier)
    .eq('period_identifier', periodIdentifier)
    .single();

  if (error) return null;
  return data;
}

export async function incrementCheckCounter(
  userId: string,
  monitorIdentifier: string,
  periodIdentifier: string,
  maxCount: number
): Promise<CheckCounter> {
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

    if (error) throw error;
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

  if (error) throw error;
  return data;
}

export async function getAllCheckCounters(userId: string): Promise<CheckCounter[]> {
  const { data, error } = await supabase
    .from('check_counters')
    .select('*')
    .eq('user_id', userId)
    .order('last_check', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function resetCheckCounters(userId: string): Promise<void> {
  const { error } = await supabase
    .from('check_counters')
    .update({
      current_count: 0,
      last_reset: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) throw error;
}

// Responded emails operations
export async function markEmailAsResponded(
  userId: string,
  emailId: string,
  senderEmail: string,
  windowIdentifier: string
): Promise<void> {
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

export async function hasEmailBeenResponded(
  emailId: string,
  windowIdentifier: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('responded_emails')
    .select('*')
    .eq('email_id', emailId)
    .eq('window_identifier', windowIdentifier)
    .single();

  if (error) return false;
  return !!data;
}

// Stats operations
export async function getEmailsProcessedToday(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'SENT')
    .gte('timestamp', today.toISOString());

  if (error) return 0;
  return count || 0;
}

export async function getEmailsProcessedThisWeek(userId: string): Promise<number> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count, error } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'SENT')
    .gte('timestamp', weekAgo.toISOString());

  if (error) return 0;
  return count || 0;
}
