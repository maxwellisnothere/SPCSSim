import { createClient } from '@supabase/supabase-js';

// ใช้ import.meta.env ในการดึงค่า (สำหรับ Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ตรวจสอบว่าค่าถูกโหลดมาจริงไหม (ป้องกัน Error ตอนรัน)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
