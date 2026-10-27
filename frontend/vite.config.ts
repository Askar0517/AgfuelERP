import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://172.20.10.3:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://172.20.10.3:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://172.20.10.3:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://172.20.10.3:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
