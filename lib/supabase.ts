import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isValidSupabaseUrl = (() => {
  if (!supabaseUrl) return false;

  try {
    const parsedUrl = new URL(supabaseUrl);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
})();

export const supabase =
  isValidSupabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl!, supabaseAnonKey)
    : null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Real-time notifications will be disabled.');
} else if (!isValidSupabaseUrl) {
  console.warn('Supabase URL is invalid. Real-time notifications will be disabled.');
}
