
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function pwaVersionPlugin(buildTimestamp: string): Plugin {
  return {
    name: 'pwa-version-plugin',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      // 1. Generate version.json in dist for live version checking
      const versionData = {
        version: buildTimestamp,
        buildDate: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(distDir, 'version.json'),
        JSON.stringify(versionData, null, 2),
        'utf8'
      );

      // 2. Inject build timestamp into dist/sw.js so the service worker bytecode
      // differs on every build, triggering immediate browser update detection
      const swDistPath = path.join(distDir, 'sw.js');
      if (fs.existsSync(swDistPath)) {
        let swContent = fs.readFileSync(swDistPath, 'utf8');
        swContent = swContent.replace(/__BUILD_TIMESTAMP__/g, buildTimestamp);
        fs.writeFileSync(swDistPath, swContent, 'utf8');
      }
    },
  };
}

const manualChunks = (id: string) => {
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
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const buildTimestamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}.${pad(now.getHours())}${pad(now.getMinutes())}`;

  return {
    plugins: [react(), pwaVersionPlugin(buildTimestamp)],
    clearScreen: false,
    define: {
      __APP_VERSION__: JSON.stringify(buildTimestamp),
    },
    server: {
      port: 3000,
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
