import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftgehvosyndexykrclrc.supabase.co';
// HINWEIS: Der hier genutzte Key "sb_publishable..." ist ein Stripe-Key.
// Ein Supabase Anon Key beginnt normalerweise mit "eyJ...". 
// Die App nutzt Fallback-Daten, solange kein gültiger Key eingetragen ist.
const supabaseAnonKey = 'sb_publishable_LBrWyOdQTgjSixQ6bEDGfg_T8kt8Ria';

const isValidKey = supabaseAnonKey && !supabaseAnonKey.startsWith('sb_');

if (!isValidKey) {
  console.warn("DinnerMatch: Ungültiger Supabase Key (Stripe-Key erkannt). Nutze lokale Mock-Daten.");
}

export const supabase = createClient(supabaseUrl, isValidKey ? supabaseAnonKey : 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.placeholder');
