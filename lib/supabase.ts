
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftgehvosyndexykrclrc.supabase.co';
// Hinweis: Dieser Key muss mit 'eyJ' beginnen, um zu funktionieren.
const supabaseAnonKey = 'sb_publishable_LBrWyOdQTgjSixQ6bEDGfg_T8kt8Ria';

export const isSupabaseConnected = supabaseAnonKey && supabaseAnonKey.startsWith('eyJ');

if (!isSupabaseConnected) {
  console.warn("DinnerMatch: Kein gültiger Supabase Anon Key. Nutze lokalen Modus & Sync-Codes.");
}

const finalKey = isSupabaseConnected ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(supabaseUrl, finalKey);
