import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineXMark, HiOutlineArrowsPointingOut } from 'react-icons/hi2';

interface ImageCropModalProps {
  file: File;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (payload: { blob: Blob; fileName: string }) => void;
}

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function buildFileName(input: string, fallbackExtension: string, forceExtension?: string): string {
  const trimmed = input.trim();
  const normalized = trimmed || `image.${fallbackExtension}`;
  const extension = (forceExtension || normalized.split('.').pop() || fallbackExtension).replace(/^\./, '');
  const base = normalized.replace(/\.[^/.]+$/, '') || 'image';
  return `${base}.${extension}`;
}

function ImageCropModal({ file, isOpen, onCancel, onConfirm }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [crop, setCrop] = useState<Crop | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [fileName, setFileName] = useState(file.name || 'image.png');

  useEffect(() => {
    if (!isOpen) return;
    const readerUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxWidth = 900;
      const maxHeight = 600;
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      setImageEl(img);
      setCanvasSize({ width, height });
      setCrop({
        x: Math.round(width * 0.1),
        y: Math.round(height * 0.1),
        width: Math.round(width * 0.8),
        height: Math.round(height * 0.8),
      });
    };
    img.src = readerUrl;
    return () => {
      URL.revokeObjectURL(readerUrl);
    };
  }, [file, isOpen]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !imageEl || !crop) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageEl, 0, 0, canvasSize.width, canvasSize.height);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(crop.x, crop.y, crop.width, crop.height);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(crop.x, crop.y, crop.width, crop.height);
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [canvasSize.height, canvasSize.width, crop, imageEl, isOpen]);

  const handlePointerDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setStartPoint({ x, y });
      setCrop({ x, y, width: 0, height: 0 });
      setIsDrawing(true);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !startPoint || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = clamp(event.clientX - rect.left, 0, canvasSize.width);
      const currentY = clamp(event.clientY - rect.top, 0, canvasSize.height);
      const x = Math.min(startPoint.x, currentX);
      const y = Math.min(startPoint.y, currentY);
      const width = Math.abs(currentX - startPoint.x);
      const height = Math.abs(currentY - startPoint.y);
      setCrop({ x, y, width, height });
    },
    [canvasSize.height, canvasSize.width, isDrawing, startPoint],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPoint(null);
  }, [isDrawing]);

  const confirmCrop = useCallback(() => {
    if (!imageEl || !crop) return;
    const safeWidth = Math.max(10, crop.width);
    const safeHeight = Math.max(10, crop.height);
    const scaleX = imageEl.naturalWidth / canvasSize.width;
    const scaleY = imageEl.naturalHeight / canvasSize.height;
    const sx = Math.max(0, Math.round(crop.x * scaleX));
    const sy = Math.max(0, Math.round(crop.y * scaleY));
    const sw = Math.min(imageEl.naturalWidth - sx, Math.round(safeWidth * scaleX));
    const sh = Math.min(imageEl.naturalHeight - sy, Math.round(safeHeight * scaleY));
    const output = document.createElement('canvas');
    output.width = Math.max(1, sw);
    output.height = Math.max(1, sh);
    const ctx = output.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imageEl, sx, sy, sw, sh, 0, 0, sw, sh);
    const shouldForcePng =
      file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif' || file.type === 'image/svg+xml';
    const targetMime = shouldForcePng ? 'image/png' : file.type || 'image/png';
    const extension = targetMime.split('/')[1] || 'png';
    output.toBlob(
      (blob) => {
        if (!blob) return;
        const finalName = buildFileName(fileName, extension, shouldForcePng ? 'png' : undefined);
        onConfirm({ blob, fileName: finalName });
      },
      targetMime,
      targetMime === 'image/jpeg' ? 0.95 : undefined,
    );
  }, [canvasSize.height, canvasSize.width, crop, file.type, fileName, imageEl, onConfirm]);

  const resetCrop = useCallback(() => {
    if (!canvasRef.current) return;
    setCrop({
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
    });
  }, [canvasSize.height, canvasSize.width]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[95vh] overflow-y-auto">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <HiOutlineXMark className="w-6 h-6" />
        </button>
        <div>
          <p className="text-xs text-aurora font-semibold uppercase tracking-[0.3em]">Crop & Rename</p>
          <h3 className="text-2xl font-semibold text-white">調整素材</h3>
          <p className="text-sm text-gray-400">拖曳選取區域以裁切圖片，並為檔案命名後再上傳。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 overflow-auto">
              {canvasSize.width > 0 && canvasSize.height > 0 ? (
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="max-w-full cursor-crosshair"
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">載入圖片中...</div>
              )}
            </div>
            <button
              type="button"
              onClick={resetCrop}
              className="mt-3 inline-flex items-center gap-2 text-xs text-gray-300 hover:text-white"
            >
              <HiOutlineArrowsPointingOut className="w-4 h-4" />
              使用整張圖片
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">檔案名稱</label>
              <input
                type="text"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-100 focus:border-aurora focus:outline-none"
                placeholder="輸入檔名"
              />
              <p className="text-[11px] text-gray-500 mt-1">可自行輸入副檔名，例如 .png 或 .jpg</p>
            </div>
            <div className="text-xs text-gray-500 bg-white/5 rounded-xl p-3">
              <p>提示：</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>拖曳滑鼠選取要保留的區域。</li>
                <li>點「使用整張圖片」可快速取消裁切。</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-white/20 text-sm text-gray-200 hover:border-white/40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={confirmCrop}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-aurora to-purple-500 text-sm font-semibold text-slate-900 disabled:opacity-60"
            disabled={!crop}
          >
            套用並上傳
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export default ImageCropModal;
