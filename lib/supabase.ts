
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.0';

const supabaseUrl = 'https://ftgehvosyndexykrclrc.supabase.co';
const supabaseAnonKey = 'sb_publishable_LBrWyOdQTgjSixQ6bEDGfg_T8kt8Ria';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
