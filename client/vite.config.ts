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
    // 確保 transformers 可以從外部載入模型
    cors: true,
    // 確保 transformers 的資源請求不被攔截
    fs: {
      allow: ['..'],
    },
  },
  // 配置 optimizeDeps 來預構建 transformers
  optimizeDeps: {
    include: ['@xenova/transformers'],
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
