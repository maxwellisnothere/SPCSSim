import { createClient } from '@supabase/supabase-js';

// --- 1. Database เก่าของคุณ ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 2. Database ใหม่ (oegujnyenqclgnagrebs) ---
// ต้องมี export const supabaseNew ด้วย เพื่อให้ App.tsx เรียกใช้ได้
const supabaseUrlNew = import.meta.env.VITE_SUPABASE_URL_NEW;
const supabaseAnonKeyNew = import.meta.env.VITE_SUPABASE_ANON_KEY_NEW;

// ป้องกันแอพแครช ถ้ายังไม่ได้ใส่ Key ใหม่ใน .env
export const supabaseNew = (supabaseUrlNew && supabaseAnonKeyNew) 
  ? createClient(supabaseUrlNew, supabaseAnonKeyNew) 
  : null;