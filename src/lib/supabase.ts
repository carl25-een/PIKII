import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key', {
  auth: {
    // Static web rendering has no window; the tracking page works without a session.
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Staff, shops, riders and agents sign in with their phone number and a PIN. Supabase needs an email-style
// login, so the phone number is mapped to an internal address that is never emailed.
export function loginEmailForPhone(phone: string) {
  return `${phone}@users.pikii.app`;
}

// Database errors are raised with a short code as the message and the readable text as the hint.
export function errorText(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { hint?: string; message?: string };
    if (e.hint) return e.hint;
    if (e.message === 'Invalid login credentials') return 'That phone number and PIN do not match. Check them and try again.';
    if (e.message) return e.message;
  }
  return 'Something went wrong. Check your connection and try again.';
}
