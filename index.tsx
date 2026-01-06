
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- MODE HYBRID (DEV/PREVIEW) ---
// Note: Uncomment baris di bawah ini HANYA jika Anda melakukan 'npm run build' untuk produksi offline penuh.
// Untuk preview di Google AI Studio, biarkan terkomentar agar menggunakan CDN di index.html.

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
