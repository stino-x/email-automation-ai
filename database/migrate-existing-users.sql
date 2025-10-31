-- Migration Script: Sync Existing Supabase Auth Users to Custom Users Table
-- Run this ONCE in your Supabase SQL Editor to sync all existing users

-- This inserts any auth.users that don't exist in your custom users table
INSERT INTO public.users (id, email, created_at)
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.users u 
  WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Check the results
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_custom_users,
  COUNT(*) - (SELECT COUNT(*) FROM public.users) as users_synced
FROM auth.users;

-- Verify all users are synced
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  u.id as custom_user_id,
  u.email as custom_email,
  CASE 
    WHEN u.id IS NULL THEN '❌ Missing'
    ELSE '✅ Synced'
  END as status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
ORDER BY status, au.created_at DESC;
