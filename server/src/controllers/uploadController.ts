import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index';
import { uploadImage, getPresignedUrl, extractKeyFromUrl } from '../services/storageService';
import { MINIO_PRESIGNED_EXPIRES } from '../config/index';

export async function uploadAsset(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const file = (req as AuthenticatedRequest & { file?: { buffer: Buffer; mimetype: string } }).file;
  if (!file) {
    return res.status(400).json({ message: '請選擇要上傳的圖片' });
  }

  try {
    const folder = typeof req.body?.folder === 'string' ? req.body.folder : undefined;
    const usePresigned = req.body?.usePresigned === 'true' || req.body?.usePresigned === true;
    
    const result = await uploadImage(file.buffer, file.mimetype, folder);
    
    // 如果請求使用預簽名 URL，生成一個
    let finalUrl = result.url;
    if (usePresigned) {
      try {
        finalUrl = await getPresignedUrl(result.key);
      } catch (presignedError) {
        console.warn('Failed to generate presigned URL, using regular URL:', presignedError);
        // 如果生成預簽名 URL 失敗，回退到原始 URL
      }
    }
    
    return res.status(201).json({
      key: result.key,
      url: finalUrl,
      // 如果使用預簽名 URL，也提供原始 URL 供參考
      ...(usePresigned && { originalUrl: result.url }),
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return res.status(500).json({ message: '上傳圖片失敗，請稍後再試' });
  }
}

/**
 * 獲取預簽名 URL 用於訪問私有文件
 */
export async function getPresignedUrlForAsset(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { url, key, expiresIn } = req.body;

  if (!url && !key) {
    return res.status(400).json({ message: '請提供 url 或 key' });
  }

  try {
    // 從 URL 中提取 key，或直接使用提供的 key
    const fileKey = key || extractKeyFromUrl(url);
    
    // 如果提供了自定義過期時間，使用它（但不超過配置的最大值）
    // 否則使用配置檔中的預設值
    const maxExpiration = MINIO_PRESIGNED_EXPIRES;
    const expiration = expiresIn ? Math.min(Number(expiresIn), maxExpiration) : undefined;
    
    const presignedUrl = await getPresignedUrl(fileKey, expiration);
    
    return res.json({
      url: presignedUrl,
      expiresIn: expiration,
    });
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    return res.status(500).json({ message: '生成預簽名 URL 失敗' });
  }
}
