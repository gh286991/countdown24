import { useState, useEffect, useRef, useCallback } from 'react';
import { getPresignedUrl, getCachedPresignedUrl, isMinIOUrl, isPresignedUrl } from '../utils/imageUtils';

/**
 * Hook 用於自動獲取預簽名 URL 並顯示圖片
 * 支援自動刷新過期的預簽名 URL
 */
export function usePresignedImage(
  url: string | undefined | null,
  options?: { autoRefresh?: boolean; refreshInterval?: number },
): string | undefined {
  const { autoRefresh = false, refreshInterval = 6 * 24 * 60 * 60 * 1000 } = options || {};
  const [presignedUrl, setPresignedUrl] = useState<string | undefined>(() => {
    if (!url) return undefined;
    if (!isMinIOUrl(url) || isPresignedUrl(url)) return url;
    return getCachedPresignedUrl(url);
  });
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const urlRef = useRef<string | undefined | null>(url);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const fetchPresignedUrl = useCallback(async (imageUrl: string, forceRefresh = false) => {
    try {
      const presigned = await getPresignedUrl(imageUrl, { forceRefresh });
      setPresignedUrl((prev) => (prev !== presigned ? presigned : prev));
      return presigned;
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      setPresignedUrl((prev) => (prev !== imageUrl ? imageUrl : prev));
      return imageUrl;
    }
  }, []);

  useEffect(() => {
    if (!url) {
      setPresignedUrl(undefined);
      return;
    }

    if (!isMinIOUrl(url)) {
      setPresignedUrl(url);
      return;
    }

    if (isPresignedUrl(url)) {
      setPresignedUrl(url);
      return;
    }

    const cached = getCachedPresignedUrl(url);
    if (cached) {
      setPresignedUrl(cached);
    } else {
      setPresignedUrl(undefined);
      fetchPresignedUrl(url);
    }

    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        const currentUrl = urlRef.current;
        if (currentUrl && isMinIOUrl(currentUrl)) {
          fetchPresignedUrl(currentUrl, true);
        }
      }, refreshInterval);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [url, autoRefresh, refreshInterval, fetchPresignedUrl]);

  return presignedUrl;
}

