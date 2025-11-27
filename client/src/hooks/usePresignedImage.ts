import { useState, useEffect, useRef, useCallback } from 'react';
import { getPresignedUrl, isMinIOUrl, isPresignedUrl } from '../utils/imageUtils';

// 緩存預簽名 URL，避免重複請求
const presignedUrlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 緩存 1 小時（預簽名 URL 有效期很長，不需要頻繁刷新）

/**
 * Hook 用於自動獲取預簽名 URL 並顯示圖片
 * 支援自動刷新過期的預簽名 URL
 */
export function usePresignedImage(
  url: string | undefined | null,
  options?: { autoRefresh?: boolean; refreshInterval?: number },
): string | undefined {
  const initialUrl =
    url && (!isMinIOUrl(url) || isPresignedUrl(url)) ? url : undefined;
  const [presignedUrl, setPresignedUrl] = useState<string | undefined>(initialUrl);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const urlRef = useRef<string | undefined | null>(url);
  const { autoRefresh = false, refreshInterval = 6 * 24 * 60 * 60 * 1000 } = options || {}; // 預設 6 天刷新一次

  // 更新 urlRef
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const fetchPresignedUrl = useCallback(async (imageUrl: string, forceRefresh = false) => {
    // 檢查緩存（除非強制刷新）
    if (!forceRefresh) {
      const cached = presignedUrlCache.get(imageUrl);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        // 使用函數式更新，避免依賴 presignedUrl
        setPresignedUrl((prev) => {
          // 只有在 URL 真的改變時才更新
          return prev !== cached.url ? cached.url : prev;
        });
        return cached.url;
      }
    }

    try {
      const presigned = await getPresignedUrl(imageUrl);
      const now = Date.now();
      // 更新緩存
      presignedUrlCache.set(imageUrl, { url: presigned, timestamp: now });
      // 使用函數式更新，避免依賴 presignedUrl
      setPresignedUrl((prev) => {
        // 只有在 URL 真的改變時才更新
        return prev !== presigned ? presigned : prev;
      });
      return presigned;
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      // 使用函數式更新，避免依賴 presignedUrl
      setPresignedUrl((prev) => {
        // 只有在 URL 真的改變時才更新
        return prev !== imageUrl ? imageUrl : prev;
      });
      return imageUrl;
    }
  }, []); // 移除 presignedUrl 依賴，使用函數式更新代替

  useEffect(() => {
    if (!url) {
      setPresignedUrl(undefined);
      return;
    }

    // 如果不是 MinIO URL，直接使用
    if (!isMinIOUrl(url)) {
      setPresignedUrl(url);
      return;
    }

    // 如果已經是預簽名 URL，直接使用（不需要再次獲取）
    if (isPresignedUrl(url)) {
      setPresignedUrl(url);
      return;
    }

    setPresignedUrl(undefined);
    // 獲取預簽名 URL
    fetchPresignedUrl(url);

    // 如果啟用自動刷新，設定定時器
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        const currentUrl = urlRef.current;
        if (currentUrl && isMinIOUrl(currentUrl)) {
          console.log('Auto-refreshing presigned URL for:', currentUrl);
          fetchPresignedUrl(currentUrl);
        }
      }, refreshInterval);
    }

    // 清理函數
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, autoRefresh, refreshInterval]); // 移除 fetchPresignedUrl 依賴，使用 useCallback 確保穩定性

  return presignedUrl;
}
