-- Email Automation Database Schema for Supabase
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Configurations table
CREATE TABLE configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    monitored_emails JSONB DEFAULT '[]'::jsonb,
    ai_prompt_template TEXT,
    is_active BOOLEAN DEFAULT false,
    max_emails_per_period INTEGER DEFAULT 10,
    once_per_window BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Google tokens table (encrypted tokens)
CREATE TABLE google_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    email_checked TEXT NOT NULL,
    check_number INTEGER,
    total_checks_allowed INTEGER,
    status TEXT NOT NULL CHECK (status IN ('NEW_EMAIL', 'NO_EMAIL', 'SENT', 'ERROR', 'LIMIT_REACHED')),
    email_subject TEXT,
    email_content TEXT,
    ai_response TEXT,
    tokens_used INTEGER,
    error_message TEXT
);

-- Responded emails table (prevent duplicate responses)
CREATE TABLE responded_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    email_id TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    window_identifier TEXT NOT NULL,
    UNIQUE(email_id, window_identifier)
);

-- Check counters table (track checks per period)
CREATE TABLE check_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    monitor_identifier TEXT NOT NULL,
    period_identifier TEXT NOT NULL,
    current_count INTEGER DEFAULT 0,
    max_count INTEGER NOT NULL,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, monitor_identifier, period_identifier)
);

-- Create indexes for better query performance
CREATE INDEX idx_activity_logs_user_timestamp ON activity_logs(user_id, timestamp DESC);
CREATE INDEX idx_activity_logs_email_checked ON activity_logs(email_checked);
CREATE INDEX idx_responded_emails_user_sender ON responded_emails(user_id, sender_email);
CREATE INDEX idx_responded_emails_window ON responded_emails(window_identifier);
CREATE INDEX idx_check_counters_user_monitor ON check_counters(user_id, monitor_identifier);
CREATE INDEX idx_check_counters_period ON check_counters(period_identifier);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE responded_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_counters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- RLS Policies for configurations table
CREATE POLICY "Users can view own configurations" ON configurations
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own configurations" ON configurations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own configurations" ON configurations
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own configurations" ON configurations
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for google_tokens table
CREATE POLICY "Users can view own tokens" ON google_tokens
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own tokens" ON google_tokens
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own tokens" ON google_tokens
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own tokens" ON google_tokens
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for activity_logs table
CREATE POLICY "Users can view own logs" ON activity_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own logs" ON activity_logs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for responded_emails table
CREATE POLICY "Users can view own responded emails" ON responded_emails
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own responded emails" ON responded_emails
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for check_counters table
CREATE POLICY "Users can view own counters" ON check_counters
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own counters" ON check_counters
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own counters" ON check_counters
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own counters" ON check_counters
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_configurations_updated_at BEFORE UPDATE ON configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_tokens_updated_at BEFORE UPDATE ON google_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old activity logs (optional - run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM activity_logs 
    WHERE timestamp < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset check counters (called by scheduler)
CREATE OR REPLACE FUNCTION reset_expired_counters()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    UPDATE check_counters
    SET current_count = 0,
        last_reset = CURRENT_TIMESTAMP
    WHERE period_identifier < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE users IS 'User accounts for email automation';
COMMENT ON TABLE configurations IS 'User configuration including monitored emails and AI prompts';
COMMENT ON TABLE google_tokens IS 'Encrypted Google OAuth tokens for Gmail and Calendar access';
COMMENT ON TABLE activity_logs IS 'Log of all email checks and responses';
COMMENT ON TABLE responded_emails IS 'Track which emails have been responded to in each window';
COMMENT ON TABLE check_counters IS 'Track number of checks performed per monitoring period';
