import crypto from 'crypto';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { uploadImage, getPresignedUrl, extractKeyFromUrl } from '../services/storageService.js';
import { MINIO_PRESIGNED_EXPIRES } from '../config/index.js';
import {
  createAssetRecord,
  findAssetByEtag,
  listAssetsForUser,
  markAssetUsed,
  deleteAsset,
} from '../services/assetLibraryService.js';

export async function uploadAsset(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ message: '無法識別使用者' });
  }

  const file = (req as AuthenticatedRequest & { file?: Express.Multer.File }).file;
  if (!file) {
    return res.status(400).json({ message: '請選擇要上傳的圖片' });
  }

  try {
    let folder = typeof req.body?.folder === 'string' ? req.body.folder : undefined;
    const usePresigned = req.body?.usePresigned === 'true' || req.body?.usePresigned === true;
    const isAssetLibraryUpload = req.body?.assetLibrary === 'true' || req.body?.assetLibrary === true;
    if (!folder && isAssetLibraryUpload) {
      folder = `users/${userId}/library`;
    }
    const computedEtag = crypto.createHash('md5').update(file.buffer).digest('hex');

    const existingAsset = await findAssetByEtag(userId, computedEtag);
    if (existingAsset) {
      await markAssetUsed(existingAsset.id);
      let reuseUrl = existingAsset.url;
      if (usePresigned) {
        try {
          reuseUrl = await getPresignedUrl(existingAsset.key);
        } catch (presignedError) {
          console.warn('Failed to generate presigned URL for existing asset, using stored URL:', presignedError);
        }
      }

      return res.status(200).json({
        key: existingAsset.key,
        url: reuseUrl,
        ...(usePresigned && { originalUrl: existingAsset.url }),
        assetId: existingAsset.id,
        reused: true,
      });
    }
    
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
    const folderFromKey = result.key.includes('/') ? result.key.split('/').slice(0, -1).join('/') : null;
    const asset = await createAssetRecord({
      userId,
      key: result.key,
      url: result.url,
      etag: result.etag || computedEtag,
      fileName: (file as any).originalname,
      contentType: file.mimetype,
      size: (file as any).size,
      folder: folderFromKey || folder,
    });
    
    return res.status(201).json({
      key: asset.key,
      url: finalUrl,
      assetId: asset.id,
      reused: false,
      // 如果使用預簽名 URL，也提供原始 URL 供參考
      ...(usePresigned && { originalUrl: asset.url }),
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

export async function getAssetLibrary(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ message: '無法識別使用者' });
  }

  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const search = typeof req.query.q === 'string' ? req.query.q : undefined;

  try {
    const { items, nextCursor } = await listAssetsForUser({
      userId,
      limit,
      cursor: cursor || null,
      search,
    });

    const normalized = items.map((asset) => ({
      id: asset.id,
      key: asset.key,
      url: asset.url,
      etag: asset.etag,
      fileName: asset.fileName,
      folder: asset.folder,
      contentType: asset.contentType,
      size: asset.size,
      createdAt: asset.createdAt instanceof Date ? asset.createdAt.toISOString() : asset.createdAt,
      updatedAt: asset.updatedAt instanceof Date ? asset.updatedAt.toISOString() : asset.updatedAt,
      lastUsedAt: asset.lastUsedAt instanceof Date ? asset.lastUsedAt.toISOString() : asset.lastUsedAt,
      usageCount: asset.usageCount || 0,
    }));

    return res.json({
      items: normalized,
      nextCursor,
    });
  } catch (error) {
    console.error('Failed to fetch asset library:', error);
    return res.status(500).json({ message: '取得素材庫資料失敗' });
  }
}

export async function removeAssetFromLibrary(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ message: '無法識別使用者' });
  }

  const { assetId } = req.params;
  if (!assetId) {
    return res.status(400).json({ message: '缺少素材 ID' });
  }

  try {
    const asset = await deleteAsset(userId, assetId);
    if (!asset) {
      return res.status(404).json({ message: '找不到素材或已被刪除' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete asset:', error);
    return res.status(500).json({ message: '刪除素材失敗' });
  }
}
