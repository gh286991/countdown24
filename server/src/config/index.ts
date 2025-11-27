// 載入環境變數（必須在所有環境變數讀取之前執行）
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const cwd = process.cwd();
const possiblePaths = [
  resolve(cwd, '.env'),
  resolve(cwd, '../.env'),
  resolve(cwd, 'server/.env'),
];

for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}

export const PORT: number = Number(process.env.PORT) || 4000;
export const CLIENT_ORIGIN: string = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
export const DEFAULT_TOTAL_DAYS: number = 24;
export const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
export const DB_NAME: string = process.env.DB_NAME || 'countdown24';
export const MINIO_ENDPOINT: string = process.env.MINIO_ENDPOINT || '';
export const MINIO_PORT: number | undefined = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : undefined;
export const MINIO_USE_SSL: boolean = process.env.MINIO_USE_SSL === undefined ? true : process.env.MINIO_USE_SSL !== 'false';
export const MINIO_ACCESS_KEY: string = process.env.MINIO_ACCESS_KEY || '';
export const MINIO_SECRET_KEY: string = process.env.MINIO_SECRET_KEY || '';
export const MINIO_BUCKET: string = process.env.MINIO_BUCKET || '';
export const MINIO_REGION: string = process.env.MINIO_REGION || 'us-east-1';
export const MINIO_PUBLIC_URL: string = process.env.MINIO_PUBLIC_URL || '';
// 預簽名 URL 過期時間（秒），預設 7 天 (604800 秒)
export const MINIO_PRESIGNED_EXPIRES: number = process.env.MINIO_PRESIGNED_EXPIRES
  ? Number(process.env.MINIO_PRESIGNED_EXPIRES)
  : 7 * 24 * 60 * 60;

// 密碼加密用的 Secret Key
export const PASSWORD_SECRET: string = process.env.PASSWORD_SECRET || 'dev-password-secret-change-in-production';

// QR Token 生成用的 Secret Key
export const QR_TOKEN_SECRET: string = process.env.QR_TOKEN_SECRET || 'dev-qr-token-secret-change-in-production';

// Google OAuth
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || '';
