-- Quick Fix: Add Service Role Policies for User Creation
-- Run this in your Supabase SQL Editor

-- Allow service role to bypass RLS for user creation
-- This is needed because the server-side code uses service role key

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage users" ON users;
DROP POLICY IF EXISTS "Service role can manage tokens" ON google_tokens;

-- Add service role policies
CREATE POLICY "Service role can manage users" ON users
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage tokens" ON google_tokens
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Verify policies
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('users', 'google_tokens')
ORDER BY tablename, policyname;
