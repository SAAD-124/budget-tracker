import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fxdnrufajxezvnyvkipn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZG5ydWZhanhlenZueXZraXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDQ0MDcsImV4cCI6MjA5NzAyMDQwN30.3FA_syvrufPtQPDBhZbHGHixS99BaxDlZ2aCeP1Sto0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
