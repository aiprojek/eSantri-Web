
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const manualChunks = (id) => {
  if (!id.includes('node_modules')) return;

  if (id.includes('/react/') || id.includes('react-dom') || id.includes('scheduler')) {
    return 'vendor-react';
  }
  if (id.includes('/firebase/auth/')) {
    return 'vendor-firebase-auth';
  }
  if (id.includes('/firebase/firestore/lite/')) {
    return 'vendor-firebase-firestore-lite';
  }
  if (id.includes('/firebase/firestore/')) {
    return 'vendor-firebase-firestore';
  }
  if (id.includes('/firebase/storage/')) {
    return 'vendor-firebase-storage';
  }
  if (id.includes('/firebase/app/')) {
    return 'vendor-firebase-app';
  }
  if (id.includes('html2canvas')) {
    return 'vendor-html2canvas';
  }
  if (id.includes('jspdf')) {
    return 'vendor-jspdf';
  }
  if (id.includes('/xlsx/')) {
    return 'vendor-xlsx';
  }
  if (id.includes('/jszip/')) {
    return 'vendor-jszip';
  }
  if (id.includes('/recharts/') || id.includes('/d3-')) {
    return 'vendor-charts';
  }
  if (id.includes('/dexie/') || id.includes('dexie-react-hooks')) {
    return 'vendor-dexie';
  }
  if (id.includes('react-hook-form')) {
    return 'vendor-forms';
  }
  if (id.includes('react-virtuoso')) {
    return 'vendor-virtuoso';
  }
  if (id.includes('/webdav/')) {
    return 'vendor-webdav';
  }
  if (id.includes('/date-fns/')) {
    return 'vendor-date';
  }
  if (id.includes('/motion/')) {
    return 'vendor-motion';
  }
};

export default defineConfig(({ mode }) => {
  const isTauriMode = mode === 'tauri-production';

  return {
    plugins: [react()],
    clearScreen: false,
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
    },
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
      outDir: 'dist',
      target: isTauriMode
        ? (process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13')
        : 'es2020',
      minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
      sourcemap: !!process.env.TAURI_DEBUG,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
