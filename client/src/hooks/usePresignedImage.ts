import { useState, useEffect, useRef } from 'react';
import { getPresignedUrl, isMinIOUrl } from '../utils/imageUtils';

/**
 * Hook 用於自動獲取預簽名 URL 並顯示圖片
 * 支援自動刷新過期的預簽名 URL
 */
export function usePresignedImage(
  url: string | undefined | null,
  options?: { autoRefresh?: boolean; refreshInterval?: number },
): string | undefined {
  const [presignedUrl, setPresignedUrl] = useState<string | undefined>(url);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { autoRefresh = false, refreshInterval = 6 * 24 * 60 * 60 * 1000 } = options || {}; // 預設 6 天刷新一次

  const fetchPresignedUrl = async (imageUrl: string) => {
    try {
      const url = await getPresignedUrl(imageUrl);
      setPresignedUrl(url);
      return url;
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      // 失敗時仍使用原 URL（可能會顯示錯誤）
      setPresignedUrl(imageUrl);
      return imageUrl;
    }
  };

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

    // 獲取預簽名 URL
    fetchPresignedUrl(url);

    // 如果啟用自動刷新，設定定時器
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        if (isMinIOUrl(url)) {
          console.log('Auto-refreshing presigned URL for:', url);
          fetchPresignedUrl(url);
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
  }, [url, autoRefresh, refreshInterval]);

  return presignedUrl;
}

