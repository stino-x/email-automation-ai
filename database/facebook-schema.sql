-- Facebook Messenger Monitoring Schema
-- Run this in your Supabase SQL Editor to add Facebook monitoring support

-- Facebook configurations table
CREATE TABLE IF NOT EXISTS facebook_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    monitors JSONB DEFAULT '[]'::jsonb,
    default_prompt_template TEXT DEFAULT 'You are a helpful assistant. Respond naturally and conversationally to this message.',
    check_interval_seconds INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Facebook credentials table (stores encrypted session data)
CREATE TABLE IF NOT EXISTS facebook_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    app_state TEXT NOT NULL, -- Encrypted Facebook session cookies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- Facebook activity logs
CREATE TABLE IF NOT EXISTS facebook_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    monitor_id TEXT NOT NULL,
    thread_name TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    message_content TEXT NOT NULL,
    ai_response TEXT,
    response_sent BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK (status IN ('NEW_MESSAGE', 'RESPONDED', 'FILTERED', 'ERROR')),
    error_message TEXT,
    tokens_used INTEGER
);

-- Facebook responded messages (prevent duplicate responses)
CREATE TABLE IF NOT EXISTS facebook_responded_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    message_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_facebook_activity_logs_user_timestamp 
ON facebook_activity_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_facebook_activity_logs_thread 
ON facebook_activity_logs(thread_name);

CREATE INDEX IF NOT EXISTS idx_facebook_responded_messages_user 
ON facebook_responded_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_facebook_responded_messages_thread 
ON facebook_responded_messages(thread_id);

-- Enable Row Level Security
ALTER TABLE facebook_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_responded_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_configurations
CREATE POLICY "Users can view own facebook configurations" ON facebook_configurations
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own facebook configurations" ON facebook_configurations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own facebook configurations" ON facebook_configurations
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own facebook configurations" ON facebook_configurations
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for facebook_credentials
CREATE POLICY "Users can view own facebook credentials" ON facebook_credentials
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own facebook credentials" ON facebook_credentials
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own facebook credentials" ON facebook_credentials
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own facebook credentials" ON facebook_credentials
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for facebook_activity_logs
CREATE POLICY "Users can view own facebook logs" ON facebook_activity_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own facebook logs" ON facebook_activity_logs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for facebook_responded_messages
CREATE POLICY "Users can view own facebook responded messages" ON facebook_responded_messages
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own facebook responded messages" ON facebook_responded_messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_facebook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_facebook_configurations_updated_at
    BEFORE UPDATE ON facebook_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_facebook_updated_at();

CREATE TRIGGER update_facebook_credentials_updated_at
    BEFORE UPDATE ON facebook_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_facebook_updated_at();
