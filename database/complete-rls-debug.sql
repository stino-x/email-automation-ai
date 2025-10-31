-- Complete RLS Debug and Fix Script
-- Run this in Supabase SQL Editor to diagnose and fix token saving issues

-- 1. Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('users', 'google_tokens')
ORDER BY tablename;

-- 2. Check existing policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('users', 'google_tokens')
ORDER BY tablename, policyname;

-- 3. Temporarily disable RLS to test (ONLY FOR DEBUGGING)
-- Uncomment these lines to test if RLS is the issue:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE google_tokens DISABLE ROW LEVEL SECURITY;

-- 4. Add proper service role policies
-- Drop existing service role policies if they exist
DROP POLICY IF EXISTS "Service role full access" ON users;
DROP POLICY IF EXISTS "Service role full access" ON google_tokens;

-- Create new service role policies that allow everything
CREATE POLICY "Service role full access" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access" ON google_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Verify service role policies were created
SELECT 
  tablename, 
  policyname,
  roles,
  cmd,
  CASE 
    WHEN qual = 'true' THEN '✅ Always True'
    ELSE qual
  END as using_clause,
  CASE 
    WHEN with_check = 'true' THEN '✅ Always True'
    ELSE with_check
  END as with_check_clause
FROM pg_policies
WHERE tablename IN ('users', 'google_tokens')
  AND 'service_role' = ANY(roles)
ORDER BY tablename;

-- 6. Test insert (this will fail if run from SQL editor, but shows the structure)
-- This is just to show what the insert looks like:
-- INSERT INTO google_tokens (user_id, access_token, refresh_token, expires_at, scopes)
-- VALUES ('test-user-id', 'test-access', 'test-refresh', NOW() + INTERVAL '1 hour', ARRAY['gmail.readonly']);

-- 7. Check if your user exists
SELECT 
  id,
  email,
  created_at,
  CASE 
    WHEN id IN (SELECT user_id FROM google_tokens) THEN '✅ Has tokens'
    ELSE '❌ No tokens'
  END as token_status
FROM users
ORDER BY created_at DESC
LIMIT 5;
