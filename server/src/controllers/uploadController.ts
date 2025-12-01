import crypto from 'crypto';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { uploadImage, getPresignedUrl, extractKeyFromUrl } from '../services/storageService.js';
import { MINIO_PRESIGNED_EXPIRES } from '../config/index.js';
import {
  createAssetRecord,
  findAssetByEtag,
  findAssetByKey,
  listAssetsForUser,
  markAssetUsed,
  deleteAsset,
  updateAssetPresigned,
  updateAssetTags,
} from '../services/assetLibraryService.js';
import { classifyImage as classifyImageService } from '../services/imageClassificationService.js';

const PRESIGNED_BUFFER_MS = 60 * 1000;

function computePresignedExpiresAt(expiresInSeconds?: number) {
  const seconds = typeof expiresInSeconds === 'number' ? expiresInSeconds : MINIO_PRESIGNED_EXPIRES;
  return new Date(Date.now() + seconds * 1000);
}

function isPresignedValid(asset: any) {
  if (!asset?.presignedUrl || !asset?.presignedExpiresAt) return false;
  const expiresAt = new Date(asset.presignedExpiresAt).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - PRESIGNED_BUFFER_MS > Date.now();
}

function parseAutoTags(rawBody: Record<string, any> | undefined): string[] {
  if (!rawBody) return [];
  const source = rawBody.autoTags ?? rawBody.tags ?? null;
  if (!source) return [];
  let list: any = source;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = list.split(',').map((part: string) => part.trim());
    }
  }
  if (!Array.isArray(list)) return [];
  const normalized: string[] = [];
  for (const candidate of list) {
    if (typeof candidate !== 'string') continue;
    const cleaned = candidate.trim().toLowerCase();
    if (!cleaned) continue;
    if (!normalized.includes(cleaned)) {
      normalized.push(cleaned);
    }
  }
  return normalized.slice(0, 10);
}

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
    let autoTags = parseAutoTags(req.body);
    let folder = typeof req.body?.folder === 'string' ? req.body.folder : undefined;
    const isAssetLibraryUpload = req.body?.assetLibrary === 'true' || req.body?.assetLibrary === true;
    if (!folder && isAssetLibraryUpload) {
      folder = `users/${userId}/library`;
    }
    
    const computedEtag = crypto.createHash('md5').update(file.buffer).digest('hex');

    const existingAsset = await findAssetByEtag(userId, computedEtag);
    if (existingAsset) {
      await markAssetUsed(existingAsset.id);
      if (!existingAsset.tags?.length && autoTags.length) {
        await updateAssetTags(existingAsset.id, autoTags);
        existingAsset.tags = autoTags;
      }
      let reuseUrl = existingAsset.presignedUrl || existingAsset.url;
      if (!isPresignedValid(existingAsset)) {
        try {
          reuseUrl = await getPresignedUrl(existingAsset.key);
          await updateAssetPresigned(existingAsset.id, reuseUrl, computePresignedExpiresAt());
        } catch (presignedError) {
          console.warn('Failed to refresh presigned URL for existing asset, using stored URL:', presignedError);
          reuseUrl = existingAsset.url;
        }
      }

      return res.status(200).json({
        key: existingAsset.key,
        url: reuseUrl,
        originalUrl: existingAsset.url,
        assetId: existingAsset.id,
        reused: true,
        tags: existingAsset.tags || [],
      });
    }

    const result = await uploadImage(file.buffer, file.mimetype, folder);
    let presignedUrl: string | null = null;
    try {
      presignedUrl = await getPresignedUrl(result.key);
    } catch (error) {
      console.warn('Failed to generate presigned URL, using regular URL:', error);
    }
    
    // 如果是素材庫上傳且沒有提供標籤，使用 presigned URL 進行自動分類
    if (isAssetLibraryUpload && autoTags.length === 0 && presignedUrl) {
      try {
        console.log('開始自動分類圖片...');
        autoTags = await classifyImageService(presignedUrl, 5);
        console.log('自動分類結果:', autoTags);
      } catch (classificationError) {
        console.warn('自動分類失敗，繼續上傳:', classificationError);
        // 分類失敗不影響上傳
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
      presignedUrl,
      presignedExpiresAt: presignedUrl ? computePresignedExpiresAt() : null,
      tags: autoTags.length ? autoTags : null,
    });

    return res.status(201).json({
      key: asset.key,
      url: asset.presignedUrl || asset.url,
      assetId: asset.id,
      reused: false,
      originalUrl: asset.url,
      tags: asset.tags || [],
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

  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ message: '無法識別使用者' });
  }

  try {
    // 從 URL 中提取 key，或直接使用提供的 key
    const fileKey = key || extractKeyFromUrl(url);
    
    // 如果提供了自定義過期時間，使用它（但不超過配置的最大值）
    // 否則使用配置檔中的預設值
    const maxExpiration = MINIO_PRESIGNED_EXPIRES;
    const expiration = expiresIn ? Math.min(Number(expiresIn), maxExpiration) : undefined;
    let asset = fileKey ? await findAssetByKey(userId, fileKey) : null;
    let presignedUrl: string;
    let expiresAtDate: Date | null = null;
    if (asset && isPresignedValid(asset) && asset.presignedUrl) {
      presignedUrl = asset.presignedUrl;
      expiresAtDate = asset.presignedExpiresAt ? new Date(asset.presignedExpiresAt) : null;
    } else {
      presignedUrl = await getPresignedUrl(fileKey, expiration);
      expiresAtDate = computePresignedExpiresAt(expiration);
      if (asset) {
        await updateAssetPresigned(asset.id, presignedUrl, expiresAtDate);
      }
    }

    return res.json({
      url: presignedUrl,
      expiresIn: expiration,
      expiresAt: expiresAtDate ? expiresAtDate.toISOString() : null,
      key: fileKey,
      etag: asset?.etag || null,
    });
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    return res.status(500).json({ message: '生成預簽名 URL 失敗' });
  }
}

export async function getBatchPresignedUrls(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { urls, keys, expiresIn } = req.body || {};
  const urlList = Array.isArray(urls) ? urls.filter((url: any) => typeof url === 'string' && url.trim().length) : [];
  const keyList = Array.isArray(keys) ? keys.filter((key: any) => typeof key === 'string' && key.trim().length) : [];

  if (!urlList.length && !keyList.length) {
    return res.status(400).json({ message: '請提供 urls 或 keys' });
  }

  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ message: '無法識別使用者' });
  }

  const maxExpiration = MINIO_PRESIGNED_EXPIRES;
  const expiration = expiresIn ? Math.min(Number(expiresIn), maxExpiration) : undefined;

  type AssetResult = Awaited<ReturnType<typeof findAssetByKey>>;
  const responseMap: Record<
    string,
    { url: string; expiresAt: string | null; etag?: string | null; key?: string }
  > = {};
  const keyCache = new Map<
    string,
    { url: string; expiresAt: string | null; etag?: string | null; key?: string }
  >();
  const assetCache = new Map<string, AssetResult | null>();

  const queue: Array<{ identifier: string; key: string | null }> = [];
  const seen = new Set<string>();

  urlList.forEach((url) => {
    if (seen.has(url)) return;
    seen.add(url);
    queue.push({ identifier: url, key: extractKeyFromUrl(url) });
  });

  keyList.forEach((key) => {
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ identifier: key, key });
  });

  const resolveAsset = async (key: string): Promise<AssetResult | null> => {
    if (assetCache.has(key)) {
      return assetCache.get(key) as AssetResult | null;
    }
    const asset = await findAssetByKey(userId, key);
    assetCache.set(key, asset);
    return asset;
  };

  await Promise.all(
    queue.map(async ({ identifier, key }) => {
      if (!key) {
        responseMap[identifier] = { url: identifier, expiresAt: null };
        return;
      }

      if (keyCache.has(key)) {
        responseMap[identifier] = { ...(keyCache.get(key) as any), key };
        return;
      }

      try {
        const asset = await resolveAsset(key);
        if (asset && asset.presignedUrl && isPresignedValid(asset)) {
          const expiresAtStr = asset.presignedExpiresAt
            ? new Date(asset.presignedExpiresAt).toISOString()
            : null;
          const entry = {
            url: asset.presignedUrl,
            expiresAt: expiresAtStr,
            etag: asset.etag,
            key,
          };
          keyCache.set(key, entry);
          responseMap[identifier] = entry;
          return;
        }

        const signed = await getPresignedUrl(key, expiration);
        const expiresAtStr = computePresignedExpiresAt(expiration).toISOString();
        const entry = {
          url: signed,
          expiresAt: expiresAtStr,
          etag: asset?.etag || null,
          key,
        };
        keyCache.set(key, entry);
        responseMap[identifier] = entry;
        if (asset) {
          await updateAssetPresigned(asset.id, signed, new Date(expiresAtStr));
        }
      } catch (error) {
        console.error('Failed to batch presign asset:', key, error);
        responseMap[identifier] = { url: identifier, expiresAt: null, key };
      }
    }),
  );

  return res.json({ urls: responseMap, count: Object.keys(responseMap).length });
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
      url: asset.presignedUrl || asset.url,
      originalUrl: asset.url,
      presignedUrl: asset.presignedUrl || null,
      presignedExpiresAt:
        asset.presignedExpiresAt instanceof Date
          ? asset.presignedExpiresAt.toISOString()
          : asset.presignedExpiresAt || null,
      etag: asset.etag,
      fileName: asset.fileName,
      folder: asset.folder,
      contentType: asset.contentType,
      size: asset.size,
      tags: asset.tags && Array.isArray(asset.tags) ? asset.tags : null,
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

export async function classifyImage(req: AuthenticatedRequest, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const file = (req as AuthenticatedRequest & { file?: Express.Multer.File }).file;
  if (!file) {
    return res.status(400).json({ message: '請選擇要分類的圖片' });
  }

  try {
    const topk = req.body?.topk ? Number(req.body.topk) : 5;
    
    // 先上傳圖片獲取 presigned URL
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: '無法識別使用者' });
    }
    
    const folder = 'temp/classification';
    const uploadResult = await uploadImage(file.buffer, file.mimetype, folder);
    let presignedUrl: string;
    try {
      presignedUrl = await getPresignedUrl(uploadResult.key);
    } catch (error) {
      console.warn('Failed to generate presigned URL for classification, using regular URL:', error);
      presignedUrl = uploadResult.url;
    }
    
    // 使用 presigned URL 進行分類
    const tags: string[] = await classifyImageService(presignedUrl, topk);
    
    // 分類完成後刪除臨時文件
    try {
      const { deleteObject } = await import('../services/storageService.js');
      await deleteObject(uploadResult.key);
    } catch (deleteError) {
      console.warn('Failed to delete temporary classification file:', deleteError);
    }
    
    return res.json({ tags });
  } catch (error) {
    console.error('圖片分類失敗:', error);
    return res.status(500).json({ message: '圖片分類失敗，請稍後再試' });
  }
}
