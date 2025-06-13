import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    hmr: {
      timeout: 120000,
      overlay: false
    },
    watch: {
      usePolling: true,
      interval: 1000
    }
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_DAILY_API_KEY': JSON.stringify(process.env.VITE_DAILY_API_KEY || '87f0c35f773411583c35bf5c5d79488504f3d872542fdf8cc8a5f9e1e1f60ef8'),
    'import.meta.env.VITE_DAILY_DOMAIN': JSON.stringify(process.env.VITE_DAILY_DOMAIN || 'emotionsapp.daily.co'),
  }
});
