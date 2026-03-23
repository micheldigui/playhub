import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'SEU_URL_DO_SUPABASE'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_ANONIMA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
