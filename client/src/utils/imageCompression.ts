interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

const defaultOptions: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.82,
  mimeType: 'image/jpeg',
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function revokeImage(image: HTMLImageElement) {
  if (image.src.startsWith('blob:')) {
    URL.revokeObjectURL(image.src);
  }
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const { maxWidth, maxHeight, quality, mimeType } = { ...defaultOptions, ...options };
  let image: HTMLImageElement | null = null;
  try {
    image = await loadImage(file);
    const { width, height } = image;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');

    if (!context) {
      return file;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const targetMimeType = options.mimeType || (file.type || '').toLowerCase() || defaultOptions.mimeType;
    const effectiveMime = targetMimeType === 'image/png' || targetMimeType === 'image/webp' || targetMimeType === 'image/gif'
      ? 'image/png'
      : targetMimeType;

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(
        (result) => resolve(result),
        effectiveMime,
        effectiveMime === 'image/jpeg' ? quality : undefined,
      );
    });

    if (!blob) {
      return file;
    }

    const extension = effectiveMime === 'image/png' ? '.png' : effectiveMime === 'image/webp' ? '.webp' : '.jpg';
    const newName = file.name.replace(/\.[^/.]+$/, '') + extension;
    const compressedFile = new File([blob], newName, { type: effectiveMime });

    // 若壓縮後反而比較大，就回傳原檔
    return compressedFile.size < file.size ? compressedFile : file;
  } catch (error) {
    console.warn('Image compression failed', error);
    return file;
  } finally {
    if (image) {
      revokeImage(image);
    }
  }
}
