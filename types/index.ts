// Core types for Email Automation Application

export type ScheduleType = 'recurring' | 'specific_dates' | 'hybrid';

export type StopAfterResponse = 'never' | 'rest_of_day' | 'rest_of_window' | 'next_period';

export type LogStatus = 'NEW_EMAIL' | 'NO_EMAIL' | 'SENT' | 'ERROR' | 'LIMIT_REACHED';

export interface RecurringConfig {
  days: string[]; // ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  interval_minutes: number; // 1, 2, 5, 10, 15, 30, 60
  max_checks_per_day?: number; // Optional: limits total checks per day
}

export interface SpecificDatesConfig {
  dates: string[]; // ['YYYY-MM-DD']
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  interval_minutes: number;
  max_checks_per_date?: number; // Optional: limits checks per date
}

export interface MonitoredEmail {
  id?: string;
  sender_email: string;
  receiving_email?: string; // Which Gmail account receives/monitors this (YOUR email)
  keywords?: string[];
  schedule_type: ScheduleType;
  recurring_config?: RecurringConfig;
  specific_dates_config?: SpecificDatesConfig;
  stop_after_response: StopAfterResponse;
  is_active?: boolean; // Individual toggle for each monitor
}

export interface UserConfiguration {
  id?: string;
  user_id: string;
  monitored_emails: MonitoredEmail[];
  ai_prompt_template: string;
  is_active: boolean;
  max_emails_per_period: number;
  once_per_window: boolean;
  calendar_id?: string; // Google Calendar ID to use (default: 'primary')
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface GoogleTokens {
  id?: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scopes: string[];
  google_email?: string; // The Google account email address
  account_label?: string; // User-friendly label (e.g., "Work Email")
  created_at?: string;
  updated_at?: string;
}

export interface ActivityLog {
  id?: string;
  user_id: string;
  timestamp: string;
  email_checked: string;
  check_number?: number;
  total_checks_allowed?: number;
  status: LogStatus;
  email_subject?: string;
  email_content?: string;
  ai_response?: string;
  tokens_used?: number;
  error_message?: string;
}

export interface RespondedEmail {
  id?: string;
  user_id: string;
  email_id: string;
  sender_email: string;
  responded_at: string;
  window_identifier: string;
}

export interface CheckCounter {
  id?: string;
  user_id: string;
  monitor_identifier: string;
  period_identifier: string;
  current_count: number;
  max_count: number;
  last_reset: string;
  last_check?: string;
  created_at?: string;
}

// API Request/Response types

export interface SaveConfigRequest {
  configuration: Omit<UserConfiguration, 'id' | 'user_id' | 'updated_at'>;
}

export interface SaveConfigResponse {
  success: boolean;
  message: string;
  configuration?: UserConfiguration;
}

export interface GetConfigResponse {
  success: boolean;
  configuration?: UserConfiguration;
}

export interface ServiceStatusRequest {
  is_active: boolean;
}

export interface ServiceStatusResponse {
  success: boolean;
  message: string;
  is_active: boolean;
}

export interface GetLogsRequest {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  email?: string;
}

export interface GetLogsResponse {
  success: boolean;
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
}

export interface GoogleAuthResponse {
  success: boolean;
  message: string;
  connected?: boolean;
  email?: string;
}

export interface StatusResponse {
  success: boolean;
  database: 'connected' | 'disconnected' | 'error';
  worker: 'connected' | 'disconnected' | 'error';
  google_gmail: 'connected' | 'disconnected';
  google_calendar: 'connected' | 'disconnected';
  groq_api: 'valid' | 'invalid' | 'missing';
  check_counts?: CheckCountInfo[];
}

export interface CheckCountInfo {
  sender_email: string;
  period: string;
  current_count: number;
  max_count: number;
  percentage: number;
}

export interface GetCheckCountsResponse {
  success: boolean;
  counts: CheckCountInfo[];
}

export interface ResetCountsResponse {
  success: boolean;
  message: string;
}

export interface TestEmailResponse {
  success: boolean;
  message: string;
  ai_response?: string;
  would_send?: boolean;
  reason?: string;
}

// Worker types

export interface WorkerConfig {
  user_id: string;
  configuration: UserConfiguration;
  google_tokens?: GoogleTokens;
}

export interface WorkerHealthResponse {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  active_monitors: number;
  last_check?: string;
}

export interface WorkerTriggerRequest {
  user_id: string;
  sender_email?: string; // If provided, only check this sender
}

export interface WorkerTriggerResponse {
  success: boolean;
  message: string;
  checks_performed?: number;
}

// Calendar types

export interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  description?: string;
}

// Email types

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  snippet: string;
  date: string;
  labelIds: string[];
}

// AI Prompt variables

export interface PromptVariables {
  EMAIL_CONTENT: string;
  SENDER_NAME: string;
  SENDER_EMAIL: string;
  CALENDAR_EVENTS: string;
  CURRENT_DATE: string;
  EMAIL_SUBJECT: string;
}

// Dashboard stats

export interface DashboardStats {
  total_monitored_emails: number;
  emails_processed_today: number;
  emails_processed_this_week: number;
  next_scheduled_check?: string;
  service_status: 'active' | 'paused';
  recent_activity: ActivityLog[];
}

// Utility types

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeWindow {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface ScheduleEstimate {
  checks_per_day?: number;
  checks_per_week?: number;
  total_checks?: number;
}
