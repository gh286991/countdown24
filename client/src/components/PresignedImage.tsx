import { useState, useCallback, useEffect } from 'react';
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
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(presignedUrl);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // 當 presignedUrl 更新時，更新 currentUrl 並重置重試計數
  useEffect(() => {
    if (presignedUrl !== currentUrl) {
      setCurrentUrl(presignedUrl);
      setRetryCount(0);
    }
  }, [presignedUrl]);

  const handleError = useCallback(
    async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const img = e.target as HTMLImageElement;
      
      // 如果是 MinIO URL 且載入失敗，可能是預簽名 URL 過期，嘗試重新獲取
      if (src && isMinIOUrl(src) && retryCount < maxRetries) {
        try {
          console.log(`Presigned URL may have expired (attempt ${retryCount + 1}/${maxRetries}), refreshing...`, src);
          const newPresignedUrl = await getPresignedUrl(src);
          setCurrentUrl(newPresignedUrl);
          setRetryCount((prev) => prev + 1);
          // 更新圖片 src 以觸發重新載入
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
    [src, retryCount, onError],
  );

  if (!currentUrl) {
    return null;
  }

  return <img src={currentUrl} onError={handleError} {...props} />;
}

