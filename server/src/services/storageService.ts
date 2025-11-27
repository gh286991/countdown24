import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import {
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_ENDPOINT,
  MINIO_BUCKET,
  MINIO_PORT,
  MINIO_REGION,
  MINIO_USE_SSL,
  MINIO_PUBLIC_URL,
  MINIO_PRESIGNED_EXPIRES,
} from '../config/index.js';

const hasValidConfig = Boolean(MINIO_ACCESS_KEY && MINIO_SECRET_KEY && MINIO_ENDPOINT && MINIO_BUCKET);

const endpointBase = MINIO_ENDPOINT
  ? `${MINIO_USE_SSL ? 'https' : 'http'}://${MINIO_ENDPOINT}${MINIO_PORT ? `:${MINIO_PORT}` : ''}`
  : '';

const s3Client = hasValidConfig
  ? new S3Client({
      region: MINIO_REGION,
      endpoint: endpointBase,
      forcePathStyle: true,
      credentials: {
        accessKeyId: MINIO_ACCESS_KEY,
        secretAccessKey: MINIO_SECRET_KEY,
      },
    })
  : null;

function guessExtension(mimeType?: string) {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return '';
  }
}

function buildFolderPath(folder?: string) {
  if (!folder) return 'uploads';
  return folder
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/') || 'uploads';
}

export async function uploadImage(buffer: Buffer, contentType?: string, folder?: string): Promise<{
  key: string;
  url: string;
  etag?: string;
}> {
  if (!s3Client || !MINIO_BUCKET) {
    throw new Error('Storage is not configured');
  }

  const safeFolder = buildFolderPath(folder);
  const extension = guessExtension(contentType);
  const key = `${safeFolder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension ? `.${extension}` : ''}`;

  const response = await s3Client.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const publicBase = MINIO_PUBLIC_URL || endpointBase;
  const url = publicBase ? `${publicBase}/${MINIO_BUCKET}/${key}` : key;

  const etag = response?.ETag ? response.ETag.replace(/"/g, '') : undefined;

  return { key, url, etag };
}

/**
 * 生成預簽名 URL，用於訪問私有 bucket 中的文件
 * @param key 文件在 bucket 中的 key
 * @param expiresIn 過期時間（秒），預設從環境變數 MINIO_PRESIGNED_EXPIRES 讀取，或 7 天
 * @returns 預簽名 URL
 */
export async function getPresignedUrl(key: string, expiresIn?: number): Promise<string> {
  // 如果沒有提供 expiresIn，使用配置檔中的值
  const expiration = expiresIn ?? MINIO_PRESIGNED_EXPIRES;
  if (!s3Client || !MINIO_BUCKET) {
    throw new Error('Storage is not configured');
  }

  const command = new GetObjectCommand({
    Bucket: MINIO_BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: expiration });
  return url;
}

/**
 * 從完整 URL 中提取 key
 * @param url 完整的 URL
 * @returns bucket key 或原始 URL
 */
export function extractKeyFromUrl(url: string): string {
  // 如果 URL 包含 bucket 名稱，提取 key
  const bucketMatch = url.match(new RegExp(`/${MINIO_BUCKET}/(.+)$`));
  if (bucketMatch) {
    return bucketMatch[1];
  }
  
  // 如果已經是 key 格式（不包含協議），直接返回
  if (!url.includes('://')) {
    return url;
  }
  
  // 否則返回原始 URL（可能是外部 URL）
  return url;
}
