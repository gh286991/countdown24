import api from '../api/client';

// 預簽名 URL 緩存時間（毫秒）
const PRESIGNED_CACHE_TTL = 45 * 60 * 1000; // 45 分鐘
const presignedCache = new Map<string, { url: string; expiresAt: number }>();
const pendingPresigned = new Map<string, Promise<string>>();
const batchQueue = new Map<string, { resolvers: Array<(value: string) => void>; rejecters: Array<(error: any) => void> }>();
const LOCAL_CACHE_KEY = 'countdown24::presignedCache_v1';
const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
let persistentCacheStore: Record<string, { url: string; expiresAt: number }> = {};
let batchTimer: ReturnType<typeof setTimeout> | null = null;

if (hasStorage) {
  try {
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          if (value && typeof value.url === 'string' && typeof value.expiresAt === 'number') {
            persistentCacheStore[key] = { url: value.url, expiresAt: value.expiresAt };
          }
        });
      }
    }
  } catch (error) {
    console.warn('Failed to parse persisted presigned cache', error);
  }
}

function persistStore() {
  if (!hasStorage) return;
  try {
    window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(persistentCacheStore));
  } catch (error) {
    console.warn('Failed to persist presigned cache', error);
  }
}

function now() {
  return Date.now();
}

function getCacheKey(urlOrKey: string) {
  return urlOrKey;
}

function getPersistentEntry(urlOrKey: string) {
  const entry = persistentCacheStore[urlOrKey];
  if (!entry) return undefined;
  if (entry.expiresAt > now()) {
    return entry;
  }
  delete persistentCacheStore[urlOrKey];
  persistStore();
  return undefined;
}

function setPersistentEntry(urlOrKey: string, url: string, expiresAt: number) {
  persistentCacheStore[urlOrKey] = { url, expiresAt };
  persistStore();
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
  const persistent = getPersistentEntry(cacheKey);
  if (persistent) {
    presignedCache.set(cacheKey, persistent);
    return persistent.url;
  }
  return undefined;
}

function setCachedPresignedUrl(urlOrKey: string, value: string, expiresAt?: number) {
  const cacheKey = getCacheKey(urlOrKey);
  const expiry = typeof expiresAt === 'number' ? expiresAt : now() + PRESIGNED_CACHE_TTL;
  presignedCache.set(cacheKey, { url: value, expiresAt: expiry });
  setPersistentEntry(cacheKey, value, expiry);
}

export function clearPresignedCache() {
  presignedCache.clear();
  pendingPresigned.clear();
  batchQueue.clear();
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  persistentCacheStore = {};
  if (hasStorage) {
    window.localStorage.removeItem(LOCAL_CACHE_KEY);
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
    const responseMap: Record<string, { url: string; expiresAt?: string } | string> = data?.urls || {};
    entries.forEach(([url, { resolvers, rejecters }]) => {
      const record = responseMap[url];
      const signed = typeof record === 'string' ? record || url : record?.url || url;
      const expiresAt = typeof record === 'object' && record?.expiresAt ? new Date(record.expiresAt).getTime() : undefined;
      setCachedPresignedUrl(url, signed, expiresAt);
      pendingPresigned.delete(url);
      resolvers.forEach((resolve) => resolve(signed));
      rejecters.length = 0;
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
    const expiresAt = data?.expiresAt ? new Date(data.expiresAt).getTime() : undefined;
    setCachedPresignedUrl(urlOrKey, signed, expiresAt);
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
    const responseMap: Record<string, { url: string; expiresAt?: string } | string> = data?.urls || {};
    uniqueTargets.forEach((url) => {
      const record = responseMap[url];
      const signed = typeof record === 'string' ? record || url : record?.url || url;
      const expiresAt = typeof record === 'object' && record?.expiresAt ? new Date(record.expiresAt).getTime() : undefined;
      setCachedPresignedUrl(url, signed, expiresAt);
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
