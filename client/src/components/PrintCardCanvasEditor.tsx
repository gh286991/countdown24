import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas as FabricCanvas, Textbox, Image as FabricImage } from 'fabric';
import * as QRCode from 'qrcode';
import api from '../api/client';
import type { VoucherDetail } from '../types/voucher';
import AssetLibraryModal from './AssetLibraryModal';
import type { UserAsset } from '../types/assets';
import { getPresignedUrl, getPresignedUrls, isMinIOUrl, normalizeMinioUrl } from '../utils/imageUtils';

interface PrintCardCanvasEditorProps {
  countdownId: string;
  day: number;
  initialJson?: any;
  onChange: (payload: { canvasJson: any; previewImage: string }) => void;
  width?: number;
  height?: number;
  allowQr?: boolean;
}

interface LoadTemplateOptions {
  voucherDetail?: VoucherDetail | null;
}

export interface PrintCardCanvasEditorRef {
  loadTemplate: (templateJson: any, options?: LoadTemplateOptions) => Promise<void>;
  getSnapshot: () => { canvasJson: any; previewImage: string } | null;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;
const TO_JSON_PROPS = ['selectable', 'name', 'assetKey'];

const PrintCardCanvasEditor = forwardRef<PrintCardCanvasEditorRef, PrintCardCanvasEditorProps>(function PrintCardCanvasEditor(
  { countdownId, day, initialJson, onChange, width = CANVAS_WIDTH, height = CANVAS_HEIGHT, allowQr = true },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  const isInitializingRef = useRef(false);
  const emitSnapshotRef = useRef<(() => void) | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [addingQr, setAddingQr] = useState(false);
  const [activeColor, setActiveColor] = useState('#1f2937');
  const [background, setBackground] = useState('#e2e8f0');
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);

  // 保持 onChange 引用最新
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    return () => {
      // 清理暫存的 object URL，避免佔用記憶體
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const buildSnapshot = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    try {
      // 確保背景色存在且與 state 同步，避免預覽底色偏差
      const bgColor =
        (typeof canvas.backgroundColor === 'string' && canvas.backgroundColor) ||
        background ||
        '#ffffff';
      canvas.backgroundColor = bgColor;
      canvas.requestRenderAll();

      const json = (canvas.toJSON as (propertiesToInclude?: string[]) => any)(TO_JSON_PROPS);
      // 保留背景色，避免重新載入時變成預設值
      const bg = bgColor || '#ffffff';
      if (bg) {
        json.background = bg;
      }
      // fabric 6 DataURL options do not accept backgroundColor; set via canvas state above
      // Use WebP to keep preview payload small (faster upload/viewing) while preserving quality
      const preview = canvas.toDataURL({ format: 'webp', quality: 0.92, multiplier: 2 });
      return { canvasJson: json, previewImage: preview };
    } catch (error) {
      console.error('Error building snapshot:', error);
      return null;
    }
  }, [background]);

  const emitSnapshot = useCallback(() => {
    const snapshot = buildSnapshot();
    if (!snapshot) return;
    try {
      onChangeRef.current(snapshot);
    } catch (error) {
      console.error('Error emitting snapshot:', error);
    }
  }, [buildSnapshot]);

  // 保持 emitSnapshot 引用最新
  useEffect(() => {
    emitSnapshotRef.current = emitSnapshot;
  }, [emitSnapshot]);

  // 暴露 loadTemplate 方法給父組件
  const applyTemplateBindings = useCallback(
    (templateJson: any, dayNumber: number, detail?: VoucherDetail | null) => {
      const clone = JSON.parse(JSON.stringify(templateJson));
      const pad = dayNumber.toString().padStart(2, '0');
      const plain = dayNumber.toString();

      const normalize = (value?: string | null) => {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      };

      const resolveDetailValue = (name?: string) => {
        if (!name || !detail) return null;
        switch (name) {
          case 'voucherTitle':
            return normalize(detail.title);
          case 'voucherMessage':
            return normalize(detail.message);
          case 'voucherLocation':
            return normalize(detail.location);
          case 'voucherValidUntil':
            return normalize(detail.validUntil);
          case 'voucherTerms':
            return normalize(detail.terms);
          case 'voucherMeta': {
            const segments: string[] = [];
            const validUntil = normalize(detail.validUntil);
            const terms = normalize(detail.terms);
            if (validUntil) {
              segments.push(`使用期限：${validUntil}`);
            }
            if (terms) {
              segments.push(`備註：${terms}`);
            }
            return segments.length ? segments.join('\n') : null;
          }
          default:
            return null;
        }
      };

      const rewrite = (node: any) => {
        if (!node) return;
        if (typeof node.text === 'string') {
          node.text = node.text.replace(/(Day|DAY)\s*(\d{1,2})/g, (_match: string, label: string, digits: string) => {
            const usePad = digits.length === 2;
            return `${label} ${usePad ? pad : plain}`;
          });

          const detailValue = resolveDetailValue(node.name);
          if (detailValue) {
            if (typeof node.bindingTemplate === 'string' && node.bindingTemplate.includes('{{value}}')) {
              node.text = node.bindingTemplate.replace('{{value}}', detailValue);
            } else {
              node.text = detailValue;
            }
          }
        }
        if (Array.isArray(node.objects)) {
          node.objects.forEach(rewrite);
        }
      };

      if (Array.isArray(clone.objects)) {
        clone.objects.forEach(rewrite);
      }
      return clone;
    },
    [],
  );

  const collectImageTargets = useCallback((node: any, bucket: Set<string>) => {
    if (!node) return;

    const register = (candidate?: string | null) => {
      if (typeof candidate !== 'string') return;
      if (!isMinIOUrl(candidate)) return;
      const normalized = normalizeMinioUrl(candidate);
      bucket.add(normalized);
      node.assetKey = normalized;
    };

    register(node.assetKey);
    register(node.src);

    const bgImage = node.backgroundImage;
    if (bgImage && typeof bgImage === 'object') {
      const bgSrc = typeof bgImage.assetKey === 'string' ? bgImage.assetKey : bgImage.src;
      register(bgSrc);
      if (typeof bgImage.assetKey !== 'string' && typeof bgSrc === 'string' && isMinIOUrl(bgSrc)) {
        bgImage.assetKey = normalizeMinioUrl(bgSrc);
      }
    }

    if (Array.isArray(node.objects)) {
      node.objects.forEach((child: any) => collectImageTargets(child, bucket));
    }
  }, []);

  const resolveImageSource = useCallback(
    async (
      url: string,
      options: { preferObjectUrl?: boolean; assetKey?: string | null; skipPresign?: boolean } = {},
    ) => {
      const preferObjectUrl = options.preferObjectUrl !== false;
      const createObjectUrl = async (input: string) => {
        const response = await fetch(input);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        objectUrlsRef.current.push(objectUrl);
        return objectUrl;
      };

      if (!url) {
        return { src: url, assetKey: options.assetKey ?? null };
      }
      if (!isMinIOUrl(url)) {
        return { src: url, assetKey: options.assetKey ?? null };
      }

      const normalized = normalizeMinioUrl(url);
      let presigned = url;
      if (!options.skipPresign) {
        try {
          presigned = await getPresignedUrl(normalized);
        } catch (error) {
          console.error('Failed to presign image URL, fallback to original:', error);
          presigned = url;
        }
      }

      if (preferObjectUrl) {
        try {
          const objUrl = await createObjectUrl(presigned);
          return { src: objUrl, assetKey: options.assetKey ?? normalized };
        } catch (error) {
          console.warn('Failed to fetch object URL, fallback to presigned URL:', error);
        }
      }

      return { src: presigned, assetKey: options.assetKey ?? normalized };
    },
    [],
  );

  const resolveNodeSources = useCallback(
    async (node: any, presignedMap: Map<string, string>) => {
      if (!node) return;
      const resolveKey = (value?: string | null) => {
        if (typeof value !== 'string') return null;
        if (!isMinIOUrl(value)) return null;
        return normalizeMinioUrl(value);
      };

      const key = resolveKey(node.assetKey || node.src);
      if (key) {
        const presigned = presignedMap.get(key) || key;
        const { src, assetKey } = await resolveImageSource(presigned, {
          preferObjectUrl: true,
          assetKey: key,
          skipPresign: true,
        });
        node.src = src;
        node.assetKey = assetKey;
      }

      const bgImage = node.backgroundImage;
      if (bgImage && typeof bgImage === 'object') {
        const bgKey = resolveKey(bgImage.assetKey || bgImage.src);
        if (bgKey) {
          const presigned = presignedMap.get(bgKey) || bgKey;
          const { src, assetKey } = await resolveImageSource(presigned, {
            preferObjectUrl: true,
            assetKey: bgKey,
            skipPresign: true,
          });
          bgImage.src = src;
          bgImage.assetKey = assetKey;
        }
      }

      if (Array.isArray(node.objects)) {
        for (const child of node.objects) {
          await resolveNodeSources(child, presignedMap);
        }
      }
    },
    [resolveImageSource],
  );

  const hydrateCanvasJson = useCallback(
    async (json: any) => {
      if (!json) return json;
      const clone = JSON.parse(JSON.stringify(json));
      const targets = new Set<string>();
      collectImageTargets(clone, targets);

      if (!targets.size) return clone;

      try {
        const presignedMap = await getPresignedUrls(Array.from(targets));
        await resolveNodeSources(clone, presignedMap);
      } catch (error) {
        console.error('Failed to refresh canvas assets:', error);
      }

      return clone;
    },
    [collectImageTargets, resolveNodeSources],
  );

  const loadJsonIntoCanvas = useCallback(
    async (canvas: FabricCanvas, json: any, isDisposed: () => boolean) => {
      if (!json || isDisposed()) return;

      return new Promise<void>((resolve, reject) => {
        try {
          canvas.loadFromJSON(json, () => {
            if (isDisposed()) {
              resolve();
              return;
            }
            if (json.background) {
              canvas.backgroundColor = json.background;
            }
            canvas.requestRenderAll();
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      loadTemplate: async (templateJson: any, options?: LoadTemplateOptions) => {
        const canvas = fabricRef.current;
        if (!canvas) {
          console.warn('Canvas not initialized');
          return;
        }
        try {
          const templateWithBindings = applyTemplateBindings(templateJson, day, options?.voucherDetail);
          const hydratedTemplate = await hydrateCanvasJson(templateWithBindings);
          // 清除現有內容
          canvas.getObjects().forEach((obj) => canvas.remove(obj));

          // 載入模板
          await loadJsonIntoCanvas(canvas, hydratedTemplate, () => false);
          if (hydratedTemplate.background) {
            setBackground(hydratedTemplate.background);
          }
          emitSnapshotRef.current?.();
        } catch (error) {
          console.error('Error loading template:', error);
        }
      },
      getSnapshot: () => buildSnapshot(),
    }),
    [applyTemplateBindings, day, hydrateCanvasJson, loadJsonIntoCanvas, buildSnapshot],
  );

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    let isDisposed = false;
    isInitializingRef.current = true;

    const canvas = new FabricCanvas(canvasElement, {
      width,
      height,
      backgroundColor: background,
      preserveObjectStacking: true,
      selection: true,
    });

    fabricRef.current = canvas;

    const loadInitial = async () => {
      if (initialJson && !isDisposed) {
        try {
          const hydrated = await hydrateCanvasJson(initialJson);
          await loadJsonIntoCanvas(canvas, hydrated, () => isDisposed);
          // 檢查 canvas 是否已經被 dispose
          if (isDisposed) return;
          if (hydrated.background && hydrated.background !== background) {
            setBackground(hydrated.background);
          }
        } catch (error) {
          console.error('Error loading canvas JSON:', error);
        }
      }
      if (!isDisposed) {
        isInitializingRef.current = false;
        // 使用 setTimeout 確保在下一幀才調用，避免循環
        setTimeout(() => {
          if (!isDisposed) {
            emitSnapshotRef.current?.();
          }
        }, 0);
      }
    };

    loadInitial();

    const handler = () => {
      if (!isInitializingRef.current && emitSnapshotRef.current && !isDisposed) {
        emitSnapshotRef.current();
      }
    };
    canvas.on('object:added', handler);
    canvas.on('object:modified', handler);
    canvas.on('object:removed', handler);

    return () => {
      isDisposed = true;
      canvas.off('object:added', handler);
      canvas.off('object:modified', handler);
      canvas.off('object:removed', handler);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [height, loadJsonIntoCanvas, width]);

  // 處理 initialJson 變化（當已有 canvas 時載入新資料）
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || isInitializingRef.current) return;
    if (!initialJson) return;

    let isCancelled = false;
    const loadJson = async () => {
      try {
        const hydrated = await hydrateCanvasJson(initialJson);
        await loadJsonIntoCanvas(canvas, hydrated, () => isCancelled);
        if (!isCancelled) {
          if (hydrated.background) {
            setBackground(hydrated.background);
          }
          emitSnapshotRef.current?.();
        }
      } catch (error) {
        console.error('Error loading canvas JSON:', error);
      }
    };
    loadJson();

    return () => {
      isCancelled = true;
    };
  }, [hydrateCanvasJson, initialJson, loadJsonIntoCanvas]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || isInitializingRef.current) return;
    canvas.backgroundColor = background;
    canvas.requestRenderAll();
    emitSnapshotRef.current?.();
  }, [background]);

  const addText = () => {
    const canvas = fabricRef.current;
    if (!canvas) {
      console.warn('Canvas not initialized');
      return;
    }
    if (isInitializingRef.current) {
      console.warn('Canvas is still initializing');
      return;
    }
    const textbox = new Textbox('雙擊編輯文字', {
      left: 80,
      top: 80,
      fill: '#0f2937',
      fontFamily: 'Pretendard, sans-serif',
      fontSize: 32,
      width: 320,
      editable: true,
    });
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
    emitSnapshot();
  };

  const addImageFromUrl = useCallback(
    async (url: string) => {
      const canvas = fabricRef.current;
      if (!canvas) {
        console.warn('Canvas not initialized');
        return;
      }
      if (isInitializingRef.current) {
        console.warn('Canvas is still initializing');
        return;
      }
      try {
        const { src, assetKey } = await resolveImageSource(url);
        const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });
        if (assetKey) {
          img.set({ assetKey });
        }
        img.set({
          left: 40,
          top: 40,
          scaleX: 0.5,
          scaleY: 0.5,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        emitSnapshot();
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    },
    [emitSnapshot, resolveImageSource],
  );

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addImageFromUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAddQr = async () => {
    const canvas = fabricRef.current;
    if (!canvas) {
      console.warn('Canvas not initialized');
      return;
    }
    if (!countdownId) {
      console.warn('countdownId is missing');
      return;
    }
    if (isInitializingRef.current) {
      console.warn('Canvas is still initializing');
      return;
    }
    
    setAddingQr(true);
    try {
      // 呼叫 API 獲取當天的禮品卡 URL
      const { data } = await api.post(`/countdowns/${countdownId}/generate-qr`, { day });
      const qrUrl = data.qrUrl;
      
      // 尋找禮品卡佔位區
      const objects = canvas.getObjects();
      const placeholderBg = objects.find((obj: any) => obj.name === 'qr-placeholder-bg');
      const placeholderText = objects.find((obj: any) => obj.name === 'qr-placeholder-text');
      
      // 決定禮品卡代碼的位置和大小
      let qrLeft = 40;
      let qrTop = 40;
      let qrSize = 160; // 預設大小
      
      if (placeholderBg) {
        // 使用佔位區的位置和大小
        qrLeft = placeholderBg.left || 40;
        qrTop = placeholderBg.top || 40;
        qrSize = Math.min(placeholderBg.width || 160, placeholderBg.height || 160);
        
        // 移除佔位區背景和文字
        canvas.remove(placeholderBg);
        if (placeholderText) {
          canvas.remove(placeholderText);
        }
      }
      
      // 生成禮品卡代碼圖片
      const dataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, scale: 8 });
      
      // 加入禮品卡代碼到佔位區的位置
      const img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
      const scale = qrSize / Math.max(img.width || 1, img.height || 1);
      img.set({
        left: qrLeft,
        top: qrTop,
        scaleX: scale,
        scaleY: scale,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      emitSnapshot();
    } catch (error) {
      console.error('Failed to generate gift card code:', error);
    } finally {
      setAddingQr(false);
    }
  };

  const handleChangeColor = (color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) {
      setBackground(color);
      return;
    }
    if (typeof active.set === 'function') {
      active.set({ fill: color });
      canvas.requestRenderAll();
      emitSnapshot();
    }
    setActiveColor(color);
  };

  const handleDeleteSelection = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (!active.length) return;
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    emitSnapshot();
  };

  const handleClear = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => canvas.remove(obj));
    canvas.requestRenderAll();
    emitSnapshot();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={addText}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
        >
          ➕ 加入文字
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
        >
          🖼️ 插入圖片
        </button>
        <button
          type="button"
          onClick={() => setShowAssetLibrary(true)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
        >
          📚 素材庫
        </button>
        {allowQr && (
          <button
            type="button"
            onClick={handleAddQr}
            disabled={addingQr || !countdownId}
            className="px-3 py-1.5 rounded-lg bg-aurora/30 hover:bg-aurora/40 disabled:opacity-50"
          >
            {addingQr ? '加入中...' : '🔗 加入解鎖 QR'}
          </button>
        )}
        <label className="flex items-center gap-2 text-xs text-gray-300">
          背景
          <input
            type="color"
            value={background}
            onChange={(event) => handleChangeColor(event.target.value)}
            className="w-10 h-8 rounded border border-white/10 bg-transparent"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          填色
          <input
            type="color"
            value={activeColor}
            onChange={(event) => handleChangeColor(event.target.value)}
            className="w-10 h-8 rounded border border-white/10 bg-transparent"
          />
        </label>
        <button
          type="button"
          onClick={handleDeleteSelection}
          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30"
        >
          刪除選取
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
        >
          清空
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900 p-4 overflow-auto">
        <div className="mx-auto rounded-2xl shadow-inner overflow-hidden" style={{ width, height }}>
          <canvas ref={canvasRef} />
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <AssetLibraryModal
        isOpen={showAssetLibrary}
        onClose={() => setShowAssetLibrary(false)}
        onSelect={(asset: UserAsset) => {
          addImageFromUrl(asset.url || asset.originalUrl || '');
          setShowAssetLibrary(false);
        }}
      />
    </div>
  );
});

export default PrintCardCanvasEditor;
