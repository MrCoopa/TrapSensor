import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ...

export default defineConfig({
  envDir: '../',
  server: {
    host: true,
    https: false, // Switch to HTTP for mobile compatibility
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', // Changed to 127.0.0.1
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000', // Changed to 127.0.0.1
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react(),
  ],
})
