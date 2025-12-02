import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineXMark, HiOutlinePhoto, HiOutlineArrowPath, HiOutlineCloudArrowUp, HiOutlineEye, HiOutlineMusicalNote } from 'react-icons/hi2';
import api from '../api/client';
import { PresignedImage } from './PresignedImage';
import { useToast } from './ToastProvider';
import { compressImage } from '../utils/imageCompression';
import type { UserAsset } from '../types/assets';
import ImageCropModal from './ImageCropModal';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: UserAsset) => void;
  allowedTypes?: ('image' | 'audio')[];
}

interface LibraryResponse {
  items: UserAsset[];
  nextCursor: string | null;
}

function AssetLibraryModal({ isOpen, onClose, onSelect, allowedTypes = ['image'] }: AssetLibraryModalProps) {
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [initialized, setInitialized] = useState(false);
  const loadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const { showToast } = useToast();
  const [lightboxAsset, setLightboxAsset] = useState<UserAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<UserAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const fetchAssets = useCallback(
    async (reset = false, overrideSearch?: string) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const params: Record<string, any> = { limit: 24 };
        const keyword = typeof overrideSearch === 'string' ? overrideSearch : search;
        if (!reset && nextCursor) {
          params.cursor = nextCursor;
        }
        if (keyword?.trim()) {
          params.q = keyword.trim();
        }
        if (allowedTypes && allowedTypes.length > 0) {
          // 簡單過濾：如果是 audio，我們假設後端支援 type 參數或者我們在前端過濾
          // 這裡假設後端還沒支援 type 過濾，我們先在前端過濾，或者後端 API 已經支援
          // 根據之前的經驗，後端可能還沒支援 type 參數，我們暫時先不傳 type，在前端過濾
          // 但為了效能，最好是後端支援。
          // 暫時先不傳 type，因為不確定後端 API。
          // 修正：如果需要過濾，我們可以在前端做，或者假設後端會返回所有類型
        }
        const { data } = await api.get<LibraryResponse>('/uploads/library', { params });

        // 前端過濾類型
        const filteredItems = data.items.filter(item => {
          const isImage = !item.contentType || item.contentType.startsWith('image/');
          const isAudio = item.contentType && item.contentType.startsWith('audio/');

          if (allowedTypes.includes('image') && isImage) return true;
          if (allowedTypes.includes('audio') && isAudio) return true;
          return false;
        });

        setAssets((prev) => (reset ? filteredItems : [...prev, ...filteredItems]));
        setNextCursor(data.nextCursor);
        setHasMore(Boolean(data.nextCursor));
        setError(null);
        if (reset) {
          setInitialized(true);
        }
      } catch (err: any) {
        console.error('Failed to load asset library', err);
        setError(err?.response?.data?.message || '無法載入素材庫，請稍後再試');
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [nextCursor, search, allowedTypes],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!initialized) {
      fetchAssets(true);
    }
  }, [fetchAssets, initialized, isOpen]);

  const handleSearchSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const trimmed = searchInput.trim();
      setSearch(trimmed);
      setNextCursor(null);
      fetchAssets(true, trimmed);
    },
    [fetchAssets, searchInput],
  );

  const handleReset = useCallback(() => {
    setSearch('');
    setSearchInput('');
    setNextCursor(null);
    fetchAssets(true, '');
  }, [fetchAssets]);

  const resetPendingFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPendingFile(null);
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadDirectly = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('usePresigned', 'true');
      formData.append('assetLibrary', 'true');

      await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('素材已加入素材庫', 'success');
      setNextCursor(null);
      await fetchAssets(true, search);
    } catch (error: any) {
      console.error('Failed to upload asset from library modal', error);
      showToast(error?.response?.data?.message || '素材上傳失敗', 'error');
    } finally {
      setUploading(false);
      resetPendingFile();
    }
  }, [fetchAssets, search, showToast]);

  const handleUploadFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setPendingFile(file);
      setShowCropModal(true);
    } else {
      // Audio or other types, skip crop
      handleUploadDirectly(file);
    }
  }, [handleUploadDirectly]);

  const handleCropCancel = useCallback(() => {
    setShowCropModal(false);
    resetPendingFile();
  }, []);

  const handleCropConfirm = useCallback(
    async ({ blob, fileName }: { blob: Blob; fileName: string }) => {
      setShowCropModal(false);
      setUploading(true);
      try {
        let uploadFile = new File([blob], fileName, { type: blob.type || pendingFile?.type || 'image/png' });
        try {
          uploadFile = await compressImage(uploadFile);
        } catch (compressionError) {
          console.warn('Skip compression for asset library upload:', compressionError);
        }
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('usePresigned', 'true');
        formData.append('assetLibrary', 'true');

        await api.post('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('素材已加入素材庫', 'success');
        setNextCursor(null);
        await fetchAssets(true, search);
      } catch (error: any) {
        console.error('Failed to upload asset from library modal', error);
        showToast(error?.response?.data?.message || '素材上傳失敗', 'error');
      } finally {
        setUploading(false);
        resetPendingFile();
      }
    },
    [fetchAssets, pendingFile?.type, search, showToast],
  );

  const confirmDeleteAsset = useCallback(async () => {
    if (!assetToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/uploads/library/${assetToDelete.id}`);
      setAssets((prev) => prev.filter((item) => item.id !== assetToDelete.id));
      if (lightboxAsset?.id === assetToDelete.id) setLightboxAsset(null);
      showToast('素材已刪除', 'success');
    } catch (error: any) {
      console.error('Failed to delete asset', error);
      showToast(error?.response?.data?.message || '刪除失敗', 'error');
    } finally {
      setDeleting(false);
      setAssetToDelete(null);
    }
  }, [assetToDelete, lightboxAsset?.id, showToast]);

  const emptyStateMessage = useMemo(() => {
    if (loading) return '素材庫載入中...';
    if (search) return '沒有符合搜尋條件的素材';
    return '尚未上傳任何素材，試著先上傳一張圖片吧！';
  }, [loading, search]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <HiOutlineXMark className="w-6 h-6" />
        </button>

        <div className="flex flex-col border-b border-white/10 pb-4 gap-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">Asset Library</p>
            <h3 className="text-2xl font-semibold text-white">我的素材庫</h3>
            <p className="text-sm text-gray-400">選擇或新增先前上傳過的素材，快速套用到編輯器。</p>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="搜尋檔名或資料夾"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-aurora focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-aurora text-slate-900 text-sm font-semibold disabled:opacity-60"
              disabled={loading && !initialized}
            >
              搜尋
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-xl border border-white/10 text-xs text-gray-300 hover:text-white flex items-center gap-1"
            >
              <HiOutlineArrowPath className="w-4 h-4" />
              重設
            </button>
          </form>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleUploadButtonClick}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/20 disabled:opacity-60"
              disabled={uploading}
            >
              <HiOutlineCloudArrowUp className="w-4 h-4" />
              {uploading ? '上傳中...' : '上傳素材'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={allowedTypes.map(t => t === 'image' ? 'image/*' : 'audio/*').join(',')}
              className="hidden"
              onChange={handleUploadFileChange}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-4 flex-1 overflow-y-auto">
          {assets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
              <HiOutlinePhoto className="w-12 h-12 text-gray-500" />
              <p className="text-sm">{emptyStateMessage}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-2xl border border-white/10 bg-white/5 hover:border-aurora transition flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(asset)}
                    className="text-left"
                  >
                    <div className="relative aspect-video bg-black/20 rounded-t-2xl overflow-hidden flex items-center justify-center">
                      {asset.contentType?.startsWith('audio/') ? (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <HiOutlineMusicalNote className="w-12 h-12 mb-2" />
                          <span className="text-xs">AUDIO</span>
                        </div>
                      ) : (
                        <PresignedImage
                          src={asset.url}
                          alt={asset.fileName || '素材圖片'}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-3 text-left text-xs">
                      <p className="font-semibold text-white truncate">{asset.fileName || '未命名檔案'}</p>
                      <p className="text-gray-400 mt-1 truncate">資料夾：{asset.folder || 'uploads'}</p>
                      {typeof asset.size === 'number' ? (
                        <p className="text-[11px] text-gray-500 mt-1">大小：{formatBytes(asset.size)}</p>
                      ) : (
                        <p className="text-[11px] text-gray-500 mt-1">大小：未知</p>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(asset.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </button>
                  <div className="px-3 pb-3 text-xs flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLightboxAsset(asset)}
                        className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white text-[11px] hover:bg-white/20"
                      >
                        <HiOutlineEye className="w-3.5 h-3.5" />
                        預覽
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssetToDelete(asset)}
                        className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-red-200 text-[11px] hover:bg-red-500/30"
                      >
                        刪除
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelect(asset)}
                      className="text-[11px] text-aurora hover:text-white"
                    >
                      套用
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {assets.length} 筆素材{search ? ` · 關鍵字「${search}」` : ''}
          </p>
          {hasMore && assets.length > 0 && (
            <button
              type="button"
              onClick={() => fetchAssets(false)}
              disabled={loading}
              className="px-4 py-2 rounded-full bg-white/10 text-sm text-gray-200 hover:bg-white/20 disabled:opacity-50"
            >
              {loading ? '載入中...' : '載入更多'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          isOpen={showCropModal}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
      {lightboxAsset &&
        createPortal(
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 px-4 py-6">
            <button
              type="button"
              onClick={() => setLightboxAsset(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white"
            >
              <HiOutlineXMark className="w-7 h-7" />
            </button>
            <div className="max-w-4xl w-full bg-slate-900 rounded-3xl p-6 space-y-4">
              <div className="w-full bg-black/30 rounded-2xl overflow-hidden max-h-[70vh] flex items-center justify-center p-8">
                {lightboxAsset.contentType?.startsWith('audio/') ? (
                  <audio controls src={lightboxAsset.url} className="w-full" />
                ) : (
                  <PresignedImage
                    src={lightboxAsset.url}
                    alt={lightboxAsset.fileName || '素材預覽'}
                    className="max-h-[70vh] w-full object-contain"
                  />
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-200">
                  <p className="text-lg font-semibold text-white">{lightboxAsset.fileName || '未命名素材'}</p>
                  <p className="text-xs text-gray-400 mt-1">資料夾：{lightboxAsset.folder || 'uploads'}</p>
                  {typeof lightboxAsset.size === 'number' && (
                    <p className="text-xs text-gray-400 mt-1">大小：{formatBytes(lightboxAsset.size)}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    更新時間：{new Date(lightboxAsset.updatedAt || lightboxAsset.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(lightboxAsset);
                    setLightboxAsset(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-aurora text-slate-900 text-sm font-semibold"
                >
                  套用這張圖
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {assetToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 px-4">
            <div className="w-full max-w-md bg-slate-900 rounded-2xl p-6 space-y-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white">刪除素材</h3>
              <p className="text-sm text-gray-300">
                確認刪除「{assetToDelete.fileName || '未命名素材'}」？圖片將從素材庫與 MinIO 永久移除。
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssetToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-sm text-gray-200 hover:border-white/40"
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAsset}
                  className="px-4 py-2 rounded-xl bg-red-500 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={deleting}
                >
                  {deleting ? '刪除中...' : '確認刪除'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default AssetLibraryModal;

function formatBytes(size?: number | null): string {
  if (!size || size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[unitIndex]}`;
}
