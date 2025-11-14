"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.signUp = signUp;
exports.signIn = signIn;
exports.signOut = signOut;
exports.getUser = getUser;
exports.getSession = getSession;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
async function signUp(email, password) {
    const { data, error } = await exports.supabase.auth.signUp({
        email,
        password,
    });
    if (error)
        throw error;
    // Call API to create user in custom table (API uses service role)
    if (data.user) {
        console.log('Calling API to create user record:', data.user.id);
        try {
            await fetch('/api/auth/sync-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': data.user.id
                },
                body: JSON.stringify({ email: email })
            });
        }
        catch (err) {
            console.error('Failed to sync user on signup:', err);
            // Don't fail signup if sync fails
        }
    }
    return data;
}
async function signIn(email, password) {
    const { data, error } = await exports.supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error)
        throw error;
    // Call API to ensure user exists in custom table (API uses service role)
    if (data.user) {
        console.log('Calling API to sync user record:', data.user.id);
        try {
            await fetch('/api/auth/sync-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': data.user.id
                },
                body: JSON.stringify({ email: email })
            });
        }
        catch (err) {
            console.error('Failed to sync user on login:', err);
            // Don't fail login if sync fails
        }
    }
    return data;
}
async function signOut() {
    const { error } = await exports.supabase.auth.signOut();
    if (error)
        throw error;
}
async function getUser() {
    const { data: { user } } = await exports.supabase.auth.getUser();
    if (!user)
        return null;
    return {
        id: user.id,
        email: user.email,
    };
}
async function getSession() {
    const { data: { session } } = await exports.supabase.auth.getSession();
    return session;
}
