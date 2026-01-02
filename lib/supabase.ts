
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftgehvosyndexykrclrc.supabase.co';
// WICHTIG: Der Key 'sb_publishable_...' ist ein Stripe-Key, kein Supabase-Key.
// Die App wird lokal funktionieren, aber keine Daten speichern, bis ein 'eyJ...' Key eingetragen wird.
const supabaseAnonKey = 'sb_publishable_LBrWyOdQTgjSixQ6bEDGfg_T8kt8Ria';

const isValidSupabaseKey = supabaseAnonKey && supabaseAnonKey.startsWith('eyJ');

if (!isValidSupabaseKey) {
  console.warn("DinnerMatch: Kein gültiger Supabase Anon Key gefunden. Nutze lokalen Modus.");
}

// Wir verwenden einen Dummy-JWT, falls der Key ungültig ist, um den Client-Crash zu verhindern
const finalKey = isValidSupabaseKey ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(supabaseUrl, finalKey);
