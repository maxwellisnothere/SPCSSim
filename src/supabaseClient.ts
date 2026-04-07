import { createClient } from '@supabase/supabase-js';

// --- 1. Database เก่า (gmvzdd...) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 2. Database ใหม่ (oeguj...) ---
const supabaseUrlNew = import.meta.env.VITE_SUPABASE_URL_NEW;
const supabaseAnonKeyNew = import.meta.env.VITE_SUPABASE_ANON_KEY_NEW;

// 💡 ใช้เงื่อนไขเช็คเพื่อป้องกัน App Crash และส่งออก supabaseNew แค่ "ครั้งเดียว"
export const supabaseNew = (supabaseUrlNew && supabaseAnonKeyNew) 
  ? createClient(supabaseUrlNew, supabaseAnonKeyNew) 
  : null;