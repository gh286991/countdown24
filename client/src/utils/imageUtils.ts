import api from '../api/client';

/**
 * 判斷 URL 是否來自我們的 MinIO 儲存
 */
export function isMinIOUrl(url: string): boolean {
  if (!url) return false;
  // 檢查是否包含 MinIO endpoint 或 bucket 名稱
  return url.includes('tomminio-api.zeabur.app') || url.includes('/countdown24/');
}

/**
 * 從 URL 中提取 key（用於獲取預簽名 URL）
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!isMinIOUrl(url)) return null;
  
  // 提取 key（bucket 名稱後的路徑）
  // 支援多種 URL 格式：
  // - https://tomminio-api.zeabur.app/countdown24/path/to/file.jpg
  // - tomminio-api.zeabur.app/countdown24/path/to/file.jpg
  // - /countdown24/path/to/file.jpg
  const match = url.match(/\/countdown24\/(.+?)(?:\?|$)/);
  if (match) {
    return match[1];
  }
  
  // 如果 URL 已經是 key 格式（不包含協議和域名）
  if (!url.includes('://') && !url.includes('tomminio-api.zeabur.app')) {
    return url;
  }
  
  return null;
}

/**
 * 獲取預簽名 URL
 */
export async function getPresignedUrl(urlOrKey: string): Promise<string> {
  try {
    const key = extractKeyFromUrl(urlOrKey);
    if (!key) {
      // 如果不是 MinIO URL，直接返回原 URL
      return urlOrKey;
    }

    const { data } = await api.post('/uploads/presigned', {
      key: key,
    });
    
    return data.url;
  } catch (error) {
    console.error('Failed to get presigned URL:', error);
    // 如果獲取失敗，返回原 URL（可能會顯示錯誤，但至少不會崩潰）
    return urlOrKey;
  }
}

/**
 * 批量獲取預簽名 URL
 */
export async function getPresignedUrls(urls: string[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  
  // 過濾出需要預簽名的 URL
  const minioUrls = urls.filter(isMinIOUrl);
  const otherUrls = urls.filter(url => !isMinIOUrl(url));
  
  // 其他 URL 直接映射
  otherUrls.forEach(url => urlMap.set(url, url));
  
  // 批量獲取預簽名 URL
  const promises = minioUrls.map(async (url) => {
    const presignedUrl = await getPresignedUrl(url);
    urlMap.set(url, presignedUrl);
  });
  
  await Promise.all(promises);
  
  return urlMap;
}

