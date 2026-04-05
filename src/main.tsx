import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App' 
import './styles/index.css' // เช็คว่า path นี้ถูกต้องตามที่ error หายไปแล้วนะคะ

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)