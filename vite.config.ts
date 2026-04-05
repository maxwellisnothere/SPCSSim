import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url' // เพิ่มบรรทัดนี้
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// เพิ่ม 2 บรรทัดนี้เพื่อสร้าง __dirname จำลองสำหรับ ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // ... โค้ดส่วนที่เหลือเหมือนเดิมเลยค่ะ ...
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})