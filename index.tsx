
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- MODE PREVIEW (CDN) ---
// Saat ini style & icon dimuat via CDN di index.html agar bisa jalan di preview browser.

// --- MODE OFFLINE (PRODUCTION) ---
// Jika ingin build 100% offline (tanpa internet), lakukan langkah ini:
// 1. Hapus link CDN Tailwind & Bootstrap Icons di index.html
// 2. Uncomment (aktifkan) 2 baris import di bawah ini:

// import './index.css';
// import 'bootstrap-icons/font/bootstrap-icons.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
