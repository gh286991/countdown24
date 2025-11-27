import api from '../api/client';

// 預簽名 URL 緩存時間（毫秒）
const PRESIGNED_CACHE_TTL = 45 * 60 * 1000; // 45 分鐘
const presignedCache = new Map<string, { url: string; expiresAt: number }>();
const pendingPresigned = new Map<string, Promise<string>>();
const batchQueue = new Map<string, { resolvers: Array<(value: string) => void>; rejecters: Array<(error: any) => void> }>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function now() {
  return Date.now();
}

function getCacheKey(urlOrKey: string) {
  return urlOrKey;
}

function getCachedPresignedUrlInternal(urlOrKey: string) {
  const cacheKey = getCacheKey(urlOrKey);
  const cached = presignedCache.get(cacheKey);
  if (cached && cached.expiresAt > now()) {
    return cached.url;
  }
  if (cached) {
    presignedCache.delete(cacheKey);
  }
  return undefined;
}

function setCachedPresignedUrl(urlOrKey: string, value: string) {
  const cacheKey = getCacheKey(urlOrKey);
  presignedCache.set(cacheKey, { url: value, expiresAt: now() + PRESIGNED_CACHE_TTL });
}

export function clearPresignedCache() {
  presignedCache.clear();
  pendingPresigned.clear();
  batchQueue.clear();
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
}

/**
 * 判斷 URL 是否來自我們的 MinIO 儲存
 */
export function isMinIOUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('tomminio-api.zeabur.app') || url.includes('/countdown24/');
}

/**
 * 判斷 URL 是否已經是預簽名 URL（包含查詢參數）
 */
export function isPresignedUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.includes('X-Amz-Algorithm') ||
    url.includes('X-Amz-Signature') ||
    url.includes('X-Amz-Credential') ||
    url.includes('AWSAccessKeyId') ||
    (url.includes('?') && (url.includes('Signature=') || url.includes('Expires=')))
  );
}

/**
 * 從 URL 中提取 key（用於獲取預簽名 URL）
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!isMinIOUrl(url)) return null;
  const urlWithoutQuery = url.split('?')[0];
  const match = urlWithoutQuery.match(/\/countdown24\/(.+?)$/);
  if (match) {
    return match[1];
  }
  if (!urlWithoutQuery.includes('://') && !urlWithoutQuery.includes('tomminio-api.zeabur.app')) {
    return urlWithoutQuery;
  }
  return null;
}

export function getCachedPresignedUrl(urlOrKey: string): string | undefined {
  return getCachedPresignedUrlInternal(urlOrKey);
}

interface PresignOptions {
  forceRefresh?: boolean;
}

function enqueueBatchRequest(urlOrKey: string): Promise<string> {
  if (pendingPresigned.has(urlOrKey)) {
    return pendingPresigned.get(urlOrKey)!;
  }

  const promise = new Promise<string>((resolve, reject) => {
    const existing = batchQueue.get(urlOrKey);
    if (existing) {
      existing.resolvers.push(resolve);
      existing.rejecters.push(reject);
    } else {
      batchQueue.set(urlOrKey, { resolvers: [resolve], rejecters: [reject] });
    }
  });

  pendingPresigned.set(urlOrKey, promise);
  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      batchTimer = null;
      flushBatchQueue();
    }, 0);
  }

  return promise;
}

async function flushBatchQueue() {
  if (!batchQueue.size) return;
  const entries = Array.from(batchQueue.entries());
  batchQueue.clear();

  const urls = entries.map(([url]) => url);

  try {
    const { data } = await api.post('/uploads/presigned/batch', { urls });
    const responseMap: Record<string, string> = data?.urls || {};
    entries.forEach(([url, { resolvers }]) => {
      const signed = responseMap[url] || url;
      setCachedPresignedUrl(url, signed);
      pendingPresigned.delete(url);
      resolvers.forEach((resolve) => resolve(signed));
    });
  } catch (error) {
    console.error('Failed to get batch presigned URLs:', error);
    entries.forEach(([url, { rejecters }]) => {
      pendingPresigned.delete(url);
      rejecters.forEach((reject) => reject(error));
    });
  }
}

/**
 * 獲取預簽名 URL，帶有內部緩存與併發控制
 */
export async function getPresignedUrl(urlOrKey: string, options: PresignOptions = {}): Promise<string> {
  if (!isMinIOUrl(urlOrKey) || isPresignedUrl(urlOrKey)) {
    return urlOrKey;
  }

  if (!options.forceRefresh) {
    const cached = getCachedPresignedUrlInternal(urlOrKey);
    if (cached) {
      return cached;
    }
    return enqueueBatchRequest(urlOrKey);
  }

  const key = extractKeyFromUrl(urlOrKey);
  if (!key) return urlOrKey;
  try {
    const { data } = await api.post('/uploads/presigned', { key });
    const signed = data?.url || urlOrKey;
    setCachedPresignedUrl(urlOrKey, signed);
    return signed;
  } catch (error) {
    console.error('Failed to refresh presigned URL:', error);
    return urlOrKey;
  }
}

/**
 * 批量獲取預簽名 URL
 */
export async function getPresignedUrls(urls: string[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const minioTargets = urls.filter(isMinIOUrl);
  const otherTargets = urls.filter((url) => !isMinIOUrl(url));

  otherTargets.forEach((url) => urlMap.set(url, url));

  const uniqueTargets = Array.from(new Set(minioTargets));
  if (!uniqueTargets.length) {
    return urlMap;
  }

  try {
    const { data } = await api.post('/uploads/presigned/batch', { urls: uniqueTargets });
    const responseMap: Record<string, string> = data?.urls || {};
    uniqueTargets.forEach((url) => {
      const signed = responseMap[url] || url;
      setCachedPresignedUrl(url, signed);
      urlMap.set(url, signed);
    });
  } catch (error) {
    console.error('Failed to batch fetch presigned URLs:', error);
    uniqueTargets.forEach((url) => {
      urlMap.set(url, url);
    });
  }

  return urlMap;
}
