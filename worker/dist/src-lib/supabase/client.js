"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerClient = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
// Client for browser (uses anon key with RLS)
exports.supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// Server client with service role (bypasses RLS)
const getServerClient = () => {
    if (!process.env.SUPABASE_SERVICE_KEY) {
        throw new Error('Missing env.SUPABASE_SERVICE_KEY');
    }
    return (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};
exports.getServerClient = getServerClient;
