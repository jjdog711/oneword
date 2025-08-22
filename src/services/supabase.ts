// Supabase client setup
// This module exposes a configured Supabase client using environment variables.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Fall back to empty strings to avoid undefined values. In production you should
// ensure these environment variables are configured via app.json or a .env file.
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Helpers for common queries can be added here. For example:
// export async function fetchTodayWords(userId: string) {
//   return supabase
//     .from('words')
//     .select('*')
//     .eq('date_local', new Date().toISOString().slice(0,10))
//     .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
// }