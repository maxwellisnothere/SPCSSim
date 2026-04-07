🏢 SPCSSim: Smart Building Energy Management Simulation
SPCSSim (Smart Power Consumption System Simulation) คือระบบจำลองการจัดการพลังงานอัจฉริยะภายในอาคาร ที่ใช้ขุมพลังจาก Linear Regression AI Model ในการวิเคราะห์และควบคุมการใช้ไฟฟ้าแบบ Real-time เพื่อเปรียบเทียบประสิทธิภาพระหว่างการใช้งานทั่วไป (Baseline) และการใช้งานที่ผ่านการปรับแต่งด้วย AI (Optimized)

!
https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcRfnuYDIUVI_yutsgPxMVpkadkBmpfofXPuVxO4RXzdxrBOMaVggN4fgYMkRllAUzcj6FCotVuV1ayhzchcSoXjWzmJIuayJQd4KAWi3qGI-EWnkzg
<img width="2048" height="1152" alt="image" src="https://github.com/user-attachments/assets/bb364657-3b69-463c-a4ee-28b752114bc5" />

🚀 Key Features
Real-time Energy Simulation: จำลองการใช้พลังงานตามสถานการณ์จริง โดยอ้างอิงจากจำนวนผู้ใช้งาน (Occupancy), อุณหภูมิ และสภาพอากาศ

AI-Driven Optimization: ใช้สมการ AI ที่มีความแม่นยำสูง (R2 Score: 0.966) ในการคำนวณและปรับลดการใช้พลังงานอัตโนมัติ

Interactive 2D Floor Plan: แผนผังอาคารรูปแบบ SVG ที่โต้ตอบได้ รองรับการ Zoom/Pan และการตั้งค่าอุปกรณ์รายห้อง

Smart Scheduling: ระบบเชื่อมต่อตารางเรียนและข้อมูลอาจารย์ผู้สอนอัตโนมัติ เพื่อคาดการณ์จำนวนผู้ใช้งานในแต่ละช่วงเวลา

Anomaly & Maintenance System: ระบบจำลองเหตุการณ์ขัดข้อง (เช่น HVAC Failure) พร้อมระบบแจ้งเตือนและบันทึกประวัติการซ่อมบำรุง

🛠 Tech Stack
Category	Technology
Frontend	React 18, Vite, TypeScript
Styling	Tailwind CSS, Lucide React (Icons)
UI Components	Radix UI, Sonner (Toasts)
State/Animation	React Hooks, Framer Motion
Database	Supabase (PostgreSQL)
Analytics	Recharts, SVG Visualization
🧠 Core Engine & AI Logic
หัวใจสำคัญของระบบคือฟังก์ชัน calculateLivePower ที่ใช้โมเดล Linear Regression จากการวิเคราะห์ข้อมูลผ่าน Google Colab ซึ่งให้ความแม่นยำสูงถึง 96.6%

AI Energy Formula:

W=(Occ×239.20)+(OutTemp×−13.68)+(InTemp×77.02)+(SetPoint×112.43)−4871.19
ปัจจัยที่มีผลต่อการใช้พลังงาน:

Occupancy: คนเพิ่ม 1 คน ส่งผลให้การใช้ไฟพุ่งขึ้นประมาณ 239.20 วัตต์

Climate Factors: อุณหภูมิภายนอกและภายในอาคารมีผลต่อน้ำหนักการทำงานของระบบ HVAC

📊 Database Schema (Supabase)
โครงการนี้ใช้โครงสร้างฐานข้อมูลเพื่อรองรับการวิเคราะห์ข้อมูลย้อนหลัง:

energy_logs: บันทึกประวัติการประหยัดพลังงาน (Baseline vs AI) รายนาที

room_energy_logs: เก็บข้อมูลรายละเอียดการใช้ไฟและสถานะอุปกรณ์แยกรายห้อง

master_schedule: จัดการข้อมูลวิชาเรียน ห้องเรียน และผู้รับผิดชอบ

simulation_status: ซิงค์สถานะเวลาจำลองและสภาพแวดล้อมให้ตรงกันทั้งระบบ

maintenance_logs: บันทึกประวัติการเกิด Anomaly และสถานะการซ่อมบำรุง

⚙️ Installation
Bash
# Clone the repository
git clone https://github.com/your-username/SPCSSim.git

# Install dependencies
npm install

# Setup Environment Variables (.env)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# Run development server
npm run dev
จัดทำขึ้นเพื่อการศึกษาในหลักสูตรวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยศรีปทุม
