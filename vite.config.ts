import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const copyM3U8Plugin = () => {
  return {
    name: 'copy-m3u8-assets',
    closeBundle() {
      const srcDir = path.resolve(process.cwd(), 'M3U8');
      const destDir = path.resolve(process.cwd(), 'dist', 'M3U8');

      if (fs.existsSync(srcDir)) {
        console.log(`[vite] Copying ${srcDir} to ${destDir}...`);
        fs.cpSync(srcDir, destDir, { recursive: true, force: true });
      } else {
        console.warn(`[vite] Warning: M3U8 directory not found at ${srcDir}`);
      }
    },
  };
};

export default defineConfig({
  plugins: [react(), copyM3U8Plugin()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
