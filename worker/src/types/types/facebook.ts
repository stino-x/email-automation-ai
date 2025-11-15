// Facebook Messenger Monitoring Types

export type FacebookMonitorType = 'group' | 'dm';

export interface FacebookMonitor {
  id?: string;
  monitor_type: FacebookMonitorType;
  thread_id: string; // Facebook thread/conversation ID
  thread_name: string; // Display name (group name or person's name)
  monitored_sender_id?: string; // Specific person to monitor in group (optional)
  monitored_sender_name?: string; // Name of person to monitor
  keywords?: string[]; // Optional keywords to filter messages
  ai_prompt_template: string; // Custom prompt for this monitor
  auto_respond: boolean; // Whether to send responses
  is_active: boolean; // Toggle monitoring on/off
  created_at?: string;
  updated_at?: string;
}

export interface FacebookConfiguration {
  id?: string;
  user_id: string;
  monitors: FacebookMonitor[];
  default_prompt_template?: string;
  check_interval_seconds: number; // How often to check (e.g., 60 = every minute)
  is_active: boolean; // Master toggle
  created_at?: string;
  updated_at?: string;
}

export interface FacebookActivityLog {
  id?: string;
  user_id: string;
  monitor_id: string;
  thread_name: string;
  sender_name: string;
  message_content: string;
  ai_response?: string;
  response_sent: boolean;
  timestamp: string;
  status: 'NEW_MESSAGE' | 'RESPONDED' | 'FILTERED' | 'ERROR';
  error_message?: string;
  tokens_used?: number;
}

export interface FacebookCredentials {
  id?: string;
  user_id: string;
  app_state: string; // Encrypted Facebook session (cookies)
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
}

export interface FacebookAuthRequest {
  username: string;
  password: string;
}

export interface FacebookThread {
  threadId: string;
  name: string;
  type: 'group' | 'dm';
  participantCount?: number;
  lastMessageTime?: string;
}

export interface FacebookMessage {
  messageId: string;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string;
  timestamp: number;
  attachments?: Array<{
    type: string;
    url?: string;
  }>;
}
