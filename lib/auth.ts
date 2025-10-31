import { createClient } from '@supabase/supabase-js';
import { getServerClient } from './supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthUser {
  id: string;
  email: string | undefined;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // Create user in custom users table using service role to bypass RLS
  if (data.user) {
    console.log('Creating user record in custom users table:', data.user.id, email);
    const serverClient = getServerClient();
    const { error: userError } = await serverClient
      .from('users')
      .insert({
        id: data.user.id,
        email: email
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      // Don't throw - auth was successful, just log the error
    } else {
      console.log('User record created successfully');
    }
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Ensure user exists in custom users table using service role to bypass RLS
  if (data.user) {
    console.log('Checking/creating user record for:', data.user.id, email);
    const serverClient = getServerClient();
    
    const { data: existingUser, error: checkError } = await serverClient
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      // User doesn't exist, create it
      console.log('User not found in custom table, creating...');
      const { error: insertError } = await serverClient
        .from('users')
        .insert({
          id: data.user.id,
          email: email
        });

      if (insertError) {
        console.error('Error creating user record on login:', insertError);
      } else {
        console.log('User record created successfully on login');
      }
    } else if (existingUser) {
      console.log('User record already exists');
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
  };
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
