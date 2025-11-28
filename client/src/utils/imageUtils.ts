import api from '../api/client';

interface CachedEntry {
  url: string;
  expiresAt: number;
  version?: string | null;
}

interface BatchQueueEntry {
  resolvers: Array<(value: string) => void>;
  rejecters: Array<(error: any) => void>;
  options: PresignOptions;
}

// 預簽名 URL 緩存時間（毫秒）
const PRESIGNED_CACHE_TTL = 45 * 60 * 1000; // 45 分鐘
const DEFAULT_REFRESH_MARGIN_MS = 15 * 1000;
const presignedCache = new Map<string, CachedEntry>();
const pendingPresigned = new Map<string, Promise<string>>();
const batchQueue = new Map<string, BatchQueueEntry>();
const LOCAL_CACHE_KEY = 'countdown24::presignedCache_v1';
const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
let persistentCacheStore: Record<string, { url: string; expiresAt: number; version?: string | null }> = {};
let batchTimer: ReturnType<typeof setTimeout> | null = null;

if (hasStorage) {
  try {
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
    if (value && typeof value.url === 'string' && typeof value.expiresAt === 'number') {
      persistentCacheStore[key] = {
        url: value.url,
        expiresAt: value.expiresAt,
        version: value.version ?? null,
      };
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
  const extracted = extractKeyFromUrl(urlOrKey);
  return extracted || urlOrKey;
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

function setPersistentEntry(urlOrKey: string, url: string, expiresAt: number, version?: string | null) {
  persistentCacheStore[urlOrKey] = { url, expiresAt, version: version ?? null };
  persistStore();
}

function getCachedPresignedUrlInternal(urlOrKey: string, version?: string | null, marginMs = DEFAULT_REFRESH_MARGIN_MS) {
  const cacheKey = getCacheKey(urlOrKey);
  const cached = presignedCache.get(cacheKey);
  if (cached && cached.expiresAt - marginMs > now()) {
    if (version && cached.version && cached.version !== version) {
      return undefined;
    }
    return cached.url;
  }
  if (cached) {
    presignedCache.delete(cacheKey);
  }
  const persistent = getPersistentEntry(cacheKey);
  if (persistent) {
    presignedCache.set(cacheKey, persistent);
    if (persistent.expiresAt - marginMs > now()) {
      if (version && persistent.version && persistent.version !== version) {
        return undefined;
      }
      return persistent.url;
    }
    presignedCache.delete(cacheKey);
  }
  return undefined;
}

function setCachedPresignedUrl(urlOrKey: string, value: string, expiresAt?: number, version?: string | null) {
  const cacheKey = getCacheKey(urlOrKey);
  const expiry = typeof expiresAt === 'number' ? expiresAt : now() + PRESIGNED_CACHE_TTL;
  const entry: CachedEntry = { url: value, expiresAt: expiry, version: version ?? null };
  presignedCache.set(cacheKey, entry);
  setPersistentEntry(cacheKey, value, expiry, entry.version);
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

export function getCachedPresignedUrl(
  urlOrKey: string,
  version?: string | null,
  marginMs?: number,
): string | undefined {
  return getCachedPresignedUrlInternal(urlOrKey, version, marginMs);
}

interface PresignOptions {
  forceRefresh?: boolean;
  expiresIn?: number;
  refreshMarginMs?: number;
}

// 批次處理的最大等待時間（毫秒）
const BATCH_WAIT_TIME = 16; // 約一幀的時間，讓多個請求可以批次處理
const MAX_BATCH_SIZE = 50; // 每批次最多處理的 URL 數量

function enqueueBatchRequest(urlOrKey: string, options: PresignOptions = {}): Promise<string> {
  if (pendingPresigned.has(urlOrKey)) {
    const existing = batchQueue.get(urlOrKey);
    if (existing) {
      existing.options = { ...existing.options, ...options };
    }
    return pendingPresigned.get(urlOrKey)!;
  }

  const promise = new Promise<string>((resolve, reject) => {
    const existing = batchQueue.get(urlOrKey);
    if (existing) {
      existing.resolvers.push(resolve);
      existing.rejecters.push(reject);
      existing.options = { ...existing.options, ...options };
    } else {
      batchQueue.set(urlOrKey, { resolvers: [resolve], rejecters: [reject], options });
    }
  });

  pendingPresigned.set(urlOrKey, promise);
  
  // 如果批次隊列已經達到最大大小，立即觸發處理
  if (batchQueue.size >= MAX_BATCH_SIZE) {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    flushBatchQueue();
  } else if (!batchTimer) {
    // 否則等待一小段時間讓更多請求可以批次處理
    batchTimer = setTimeout(() => {
      batchTimer = null;
      flushBatchQueue();
    }, BATCH_WAIT_TIME);
  }

  return promise;
}

async function flushBatchQueue() {
  if (!batchQueue.size) return;

  const entries = Array.from(batchQueue.entries());
  batchQueue.clear();

  const processChunk = async (chunk: Array<[string, BatchQueueEntry]>) => {
    const urls = chunk.map(([url]) => url);
    const expiresIn = chunk[0]?.[1].options?.expiresIn;
    try {
      const { data } = await api.post('/uploads/presigned/batch', { urls, expiresIn });
      const responseMap: Record<
        string,
        { url: string; expiresAt?: string | null; etag?: string | null } | string
      > = data?.urls || {};
      chunk.forEach(([url, { resolvers, rejecters }]) => {
        const record = responseMap[url];
        const signed = typeof record === 'string' ? record || url : record?.url || url;
        const expiresAt =
          typeof record === 'object' && record?.expiresAt ? new Date(record?.expiresAt).getTime() : undefined;
        const version = typeof record === 'object' ? record?.etag ?? null : null;
        setCachedPresignedUrl(url, signed, expiresAt, version);
        pendingPresigned.delete(url);
        resolvers.forEach((resolve) => resolve(signed));
        rejecters.length = 0;
      });
    } catch (error) {
      console.error('Failed to get batch presigned URLs:', error);
      chunk.forEach(([url, { rejecters }]) => {
        pendingPresigned.delete(url);
        rejecters.forEach((reject) => reject(error));
      });
    }
  };

  if (entries.length > MAX_BATCH_SIZE) {
    const chunks: Array<Array<[string, BatchQueueEntry]>> = [];
    for (let i = 0; i < entries.length; i += MAX_BATCH_SIZE) {
      chunks.push(entries.slice(i, i + MAX_BATCH_SIZE));
    }
    await Promise.allSettled(chunks.map(processChunk));
    return;
  }

  await processChunk(entries);
}

/**
 * 獲取預簽名 URL，帶有內部緩存與併發控制
 */
export async function getPresignedUrl(urlOrKey: string, options: PresignOptions = {}): Promise<string> {
  if (!isMinIOUrl(urlOrKey) || isPresignedUrl(urlOrKey)) {
    return urlOrKey;
  }

  if (!options.forceRefresh) {
    const cached = getCachedPresignedUrlInternal(
      urlOrKey,
      undefined,
      options.refreshMarginMs ?? DEFAULT_REFRESH_MARGIN_MS,
    );
    if (cached) {
      return cached;
    }
    return enqueueBatchRequest(urlOrKey, options);
  }

  const key = extractKeyFromUrl(urlOrKey);
  if (!key) return urlOrKey;

  try {
    const { data } = await api.post('/uploads/presigned', { key, expiresIn: options.expiresIn });
    const signed = data?.url || urlOrKey;
    const expiresAt = data?.expiresAt ? new Date(data.expiresAt).getTime() : undefined;
    const version = data?.etag ?? null;
    setCachedPresignedUrl(urlOrKey, signed, expiresAt, version);
    return signed;
  } catch (error) {
    console.error('Failed to refresh presigned URL:', error);
    return urlOrKey;
  }
}

/**
 * 批量獲取預簽名 URL
 */
export async function getPresignedUrls(urls: string[], options: PresignOptions = {}): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const minioTargets = urls.filter(isMinIOUrl);
  const otherTargets = urls.filter((url) => !isMinIOUrl(url));

  otherTargets.forEach((url) => urlMap.set(url, url));

  const uniqueTargets = Array.from(new Set(minioTargets));
  if (!uniqueTargets.length) {
    return urlMap;
  }

  const targetsToFetch: string[] = [];
  const refreshMargin = options.refreshMarginMs ?? DEFAULT_REFRESH_MARGIN_MS;
  uniqueTargets.forEach((url) => {
    if (!options.forceRefresh) {
      const cached = getCachedPresignedUrlInternal(url, undefined, refreshMargin);
      if (cached) {
        urlMap.set(url, cached);
        return;
      }
    }
    targetsToFetch.push(url);
  });

  if (!targetsToFetch.length) {
    return urlMap;
  }

  try {
    const { data } = await api.post('/uploads/presigned/batch', {
      urls: targetsToFetch,
      expiresIn: options.expiresIn,
    });
    const responseMap: Record<string, { url: string; expiresAt?: string | null; etag?: string | null } | string> =
      data?.urls || {};
    targetsToFetch.forEach((url) => {
      const record = responseMap[url];
      const signed = typeof record === 'string' ? record || url : record?.url || url;
      const expiresAt = typeof record === 'object' && record?.expiresAt ? new Date(record.expiresAt).getTime() : undefined;
      const version = typeof record === 'object' ? record?.etag ?? null : null;
      setCachedPresignedUrl(url, signed, expiresAt, version);
      urlMap.set(url, signed);
    });
  } catch (error) {
    console.error('Failed to batch fetch presigned URLs:', error);
    uniqueTargets.forEach((url) => {
      if (!urlMap.has(url)) {
        urlMap.set(url, url);
      }
    });
  }

  return urlMap;
}
