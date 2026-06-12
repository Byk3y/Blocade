import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True only when both env vars are present. When false the app runs offline. */
export const supabaseConfigured = !!url && !!anonKey;

if (!supabaseConfigured) {
  // Don't throw at import time — that would crash the whole app before the auth
  // layer can degrade to offline. Log loudly and fall back to an unreachable
  // client; sign-in simply fails and the app keeps working locally.
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — running offline. Set them in .env and restart `expo start -c`.',
  );
}

/**
 * Single Supabase client for the app, typed against the live schema.
 * Sessions persist via AsyncStorage on native so players stay signed in.
 * On web we let supabase-js use its default (localStorage) and skip URL
 * session detection since this is a native-first app.
 */
export const supabase = createClient<Database>(url ?? 'http://localhost:54321', anonKey ?? 'offline', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = Database['public']['Tables']['profiles']['Row'];
