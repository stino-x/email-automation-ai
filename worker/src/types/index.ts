export interface UserConfiguration {
  user_id: string;
  monitored_emails: MonitoredEmail[];
  ai_prompt_template: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MonitoredEmail {
  email_address: string;
  keywords?: string[];
  schedule: ScheduleConfig;
  stop_after_response?: boolean;
}

export interface ScheduleConfig {
  type: 'recurring' | 'specific_dates' | 'hybrid';
  
  // For recurring schedules
  days_of_week?: number[];
  time_window_start?: string;
  time_window_end?: string;
  check_interval_minutes?: number;
  max_checks_per_day?: number;
  
  // For specific dates
  specific_dates?: SpecificDate[];
  
  // For hybrid
  recurring_config?: ScheduleConfig;
  specific_config?: ScheduleConfig;
}

export interface SpecificDate {
  date: string;
  time_window_start: string;
  time_window_end: string;
  check_interval_minutes: number;
  max_checks?: number;
}

export interface GoogleTokens {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  scope: string;
}

export interface ActivityLog {
  id?: string;
  user_id: string;
  monitored_email: string;
  status: 'NEW_EMAIL' | 'SENT' | 'NO_EMAIL' | 'ERROR' | 'LIMIT_REACHED';
  check_number?: number;
  max_checks?: number;
  email_from?: string;
  email_subject?: string;
  ai_response?: string;
  error_message?: string;
  created_at?: string;
}

export interface CheckCounter {
  user_id: string;
  monitor_identifier: string;
  period_identifier: string;
  current_count: number;
  max_count: number;
  last_check?: string;
  last_reset?: string;
}
