
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftgehvosyndexykrclrc.supabase.co';

// Dein bereitgestellter Anon Key
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z2Vodm9zeW5kZXh5a3JjbHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTc1NzIsImV4cCI6MjA4MjkzMzU3Mn0.K_R7HydwHuX6DDr8zpM_0BLrMheyfroxyH4aZwc3Q-4';

export const isSupabaseConnected = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
