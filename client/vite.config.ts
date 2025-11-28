import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
    // SPA fallback - 所有路由都返回 index.html
    historyApiFallback: true,
  },
  // 確保生產環境打包後也能正確處理路由
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
