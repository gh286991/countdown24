import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Textbox, Image as FabricImage } from 'fabric';
import QRCode from 'qrcode';

interface PrintCardCanvasEditorProps {
  initialJson?: any;
  onChange: (payload: { canvasJson: any; previewImage: string }) => void;
  width?: number;
  height?: number;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;

function PrintCardCanvasEditor({ initialJson, onChange, width = CANVAS_WIDTH, height = CANVAS_HEIGHT }: PrintCardCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  const isInitializingRef = useRef(false);
  const emitSnapshotRef = useRef<(() => void) | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [activeColor, setActiveColor] = useState('#1f2937');
  const [background, setBackground] = useState('#e2e8f0');

  // 保持 onChange 引用最新
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const emitSnapshot = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    try {
      const json = canvas.toJSON(['selectable']);
      const preview = canvas.toDataURL({ format: 'png', multiplier: 2 });
      onChangeRef.current({ canvasJson: json, previewImage: preview });
    } catch (error) {
      console.error('Error emitting snapshot:', error);
    }
  }, []);

  // 保持 emitSnapshot 引用最新
  useEffect(() => {
    emitSnapshotRef.current = emitSnapshot;
  }, [emitSnapshot]);

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
          await canvas.loadFromJSON(initialJson);
          // 檢查 canvas 是否已經被 dispose
          if (isDisposed) return;
          if (initialJson.background && initialJson.background !== background) {
            canvas.backgroundColor = initialJson.background;
            setBackground(initialJson.background);
          }
          canvas.requestRenderAll();
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
  }, [height, width]);

  // 處理 initialJson 變化（當已有 canvas 時載入新資料）
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || isInitializingRef.current) return;
    if (!initialJson) return;

    let isCancelled = false;
    const loadJson = async () => {
      try {
        await canvas.loadFromJSON(initialJson);
        if (isCancelled) return;
        if (initialJson.background) {
          canvas.backgroundColor = initialJson.background;
          setBackground(initialJson.background);
        }
        canvas.requestRenderAll();
        emitSnapshotRef.current?.();
      } catch (error) {
        console.error('Error loading canvas JSON:', error);
      }
    };
    loadJson();

    return () => {
      isCancelled = true;
    };
  }, [initialJson]);

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

  const addImageFromUrl = async (url: string) => {
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
      const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
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
  };

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
    if (!qrValue.trim()) {
      console.warn('QR value is empty');
      return;
    }
    if (isInitializingRef.current) {
      console.warn('Canvas is still initializing');
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(qrValue.trim(), { margin: 1, scale: 8 });
      addImageFromUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code', error);
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
    // @ts-expect-error fabric typings
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
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg">
          <input
            type="text"
            value={qrValue}
            onChange={(event) => setQrValue(event.target.value)}
            placeholder="QR 內容"
            className="bg-transparent text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddQr}
            className="text-xs px-2 py-1 rounded bg-aurora/30 text-white"
          >
            加入 QR
          </button>
        </div>
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
    </div>
  );
}

export default PrintCardCanvasEditor;
