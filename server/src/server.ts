import { config } from 'dotenv';
import path, { resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// 載入 .env 檔案：嘗試多個可能的位置
const cwd = process.cwd();
const possiblePaths = [
  resolve(cwd, '.env'),                    // 當前目錄（可能是根目錄或 server 目錄）
  resolve(cwd, '../.env'),                 // 父目錄（如果從 server 目錄運行）
  resolve(cwd, 'server/.env'),             // server 子目錄（如果從根目錄運行）
];

// 按順序嘗試載入第一個存在的 .env 檔案
let loaded = false;
for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log(`✓ Loaded .env from: ${envPath}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn('⚠ No .env file found. Please create one in the project root or server directory.');
}

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { PORT, CLIENT_ORIGIN, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, GOOGLE_CLIENT_ID } from './config/index.js';
import { connectDatabase } from './db/connection.js';
import { seedDemoData } from './db/seed.js';
import authRoutes from './routes/authRoutes.js';
import countdownRoutes from './routes/countdownRoutes.js';
import receiverRoutes from './routes/receiverRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import type { Request, Response, NextFunction } from 'express';

const app = express();

// Middleware
app.use(
  cors({
    origin: [CLIENT_ORIGIN],
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(compression());
app.use(morgan('dev'));

// 靜態檔案服務（部署時提供前端 build 結果）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientBuildPath = resolve(__dirname, '../../client/dist');

if (existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID || null,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/countdowns', countdownRoutes);
app.use('/api/receiver', receiverRoutes);
app.use('/api/uploads', uploadRoutes);

// 前端路由：非 /api/* 的請求交給 React 處理
if (existsSync(clientBuildPath)) {
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(resolve(clientBuildPath, 'index.html'));
  });
}

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Bootstrap
async function bootstrap() {
  // 檢查 MINIO 配置
  const hasMinioConfig = Boolean(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY && MINIO_BUCKET);
  if (!hasMinioConfig) {
    console.error('❌ MINIO storage is not configured!');
    console.error('Required environment variables:');
    console.error(`  MINIO_ENDPOINT: ${MINIO_ENDPOINT || 'MISSING'}`);
    console.error(`  MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY ? '***' : 'MISSING'}`);
    console.error(`  MINIO_SECRET_KEY: ${MINIO_SECRET_KEY ? '***' : 'MISSING'}`);
    console.error(`  MINIO_BUCKET: ${MINIO_BUCKET || 'MISSING'}`);
  } else {
    console.log('✓ MINIO storage configuration loaded');
  }

  await connectDatabase();
  await seedDemoData();
  app.listen(PORT, () => {
    console.log(`Countdown24 API ready on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Unable to start API server', error);
  process.exit(1);
});
