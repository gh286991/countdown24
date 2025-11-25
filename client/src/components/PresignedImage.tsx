import { useState, useCallback, useEffect, useRef } from 'react';
import { usePresignedImage } from '../hooks/usePresignedImage';
import { getPresignedUrl, isMinIOUrl } from '../utils/imageUtils';

interface PresignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined | null;
}

/**
 * 自動處理預簽名 URL 的圖片組件
 * 當預簽名 URL 過期時會自動重新獲取
 */
export function PresignedImage({ src, onError, ...props }: PresignedImageProps) {
  const presignedUrl = usePresignedImage(src);
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  const srcRef = useRef(src);
  const prevPresignedUrlRef = useRef<string | undefined>(presignedUrl);

  // 當 src 改變時，重置重試計數
  useEffect(() => {
    if (srcRef.current !== src) {
      srcRef.current = src;
      retryCountRef.current = 0;
      prevPresignedUrlRef.current = undefined; // 重置追蹤值
    }
  }, [src]);

  // 追蹤 presignedUrl 的變化
  useEffect(() => {
    if (presignedUrl !== prevPresignedUrlRef.current) {
      prevPresignedUrlRef.current = presignedUrl;
      retryCountRef.current = 0;
    }
  }, [presignedUrl]);

  const handleError = useCallback(
    async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const img = e.target as HTMLImageElement;
      const currentSrc = srcRef.current;
      
      // 如果是 MinIO URL 且載入失敗，可能是預簽名 URL 過期，嘗試重新獲取
      if (currentSrc && isMinIOUrl(currentSrc) && retryCountRef.current < maxRetries) {
        try {
          console.log(`Presigned URL may have expired (attempt ${retryCountRef.current + 1}/${maxRetries}), refreshing...`, currentSrc);
          const newPresignedUrl = await getPresignedUrl(currentSrc);
          retryCountRef.current += 1;
          // 直接更新圖片 src，觸發重新載入
          img.src = newPresignedUrl;
          return; // 不調用原始的 onError，讓圖片重新載入
        } catch (error) {
          console.error('Failed to refresh presigned URL:', error);
          // 如果重新獲取失敗，繼續執行錯誤處理
        }
      }

      // 如果重試次數已達上限或不是 MinIO URL，調用原始的 onError
      if (onError) {
        onError(e);
      } else {
        // 預設行為：隱藏圖片
        img.style.display = 'none';
      }
    },
    [onError], // 移除 src 和 retryCount 依賴，使用 ref 代替
  );

  if (!presignedUrl) {
    return null;
  }

  return <img src={presignedUrl} onError={handleError} {...props} />;
}

