// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['lucide-react', 'motion'], 
        },
      },
    },
  },
  server: {
    port: 5173,
    hmr: true,
    // Add proxy configuration to route API requests to the Express server
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // The port where server.ts runs
        changeOrigin: true,
        secure: false,
      },
    },
  },
});