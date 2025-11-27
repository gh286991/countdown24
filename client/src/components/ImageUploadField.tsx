import { ChangeEvent, useRef, useState, CSSProperties } from 'react';
import { HiOutlineCloudArrowUp } from 'react-icons/hi2';
import api from '../api/client';
import { useToast } from './ToastProvider';
import { PresignedImage } from './PresignedImage';
import { compressImage } from '../utils/imageCompression';

interface ImageUploadFieldProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  folder?: string;
  helperText?: string;
  className?: string;
  inputClassName?: string;
  previewClassName?: string;
  hidePreview?: boolean;
  previewStyle?: CSSProperties;
  previewFit?: 'cover' | 'contain';
}

function ImageUploadField({
  label,
  value,
  onChange,
  placeholder,
  folder,
  helperText,
  className,
  inputClassName,
  previewClassName,
  hidePreview = false,
  previewStyle,
  previewFit = 'cover',
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let uploadFile = file;
      try {
        uploadFile = await compressImage(file);
      } catch (compressionError) {
        console.warn('Image compression skipped', compressionError);
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      if (folder) {
        formData.append('folder', folder);
      }
      // 上傳時要求返回預簽名 URL
      formData.append('usePresigned', 'true');
      
      const { data } = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
      showToast('圖片上傳成功', 'success');
    } catch (error: any) {
      console.error('Upload failed', error);
      showToast(error?.response?.data?.message || '圖片上傳失敗', 'error');
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className={className}>
      {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
      <div className="flex gap-2">
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={
            inputClassName ||
            'flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/10 focus:border-aurora focus:outline-none'
          }
        />
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-xs flex items-center gap-1 text-gray-200 hover:bg-white/20 disabled:opacity-50"
        >
          <HiOutlineCloudArrowUp className="w-4 h-4" />
          {uploading ? '上傳中...' : '上傳'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
      {!hidePreview && value && (
        <PresignedImage
          src={value}
          alt="圖片預覽"
          className={`${previewClassName || 'mt-2 w-full h-32 rounded-lg border border-white/10 bg-white/5'} ${previewFit === 'contain' ? 'object-contain' : 'object-cover'}`}
          style={previewStyle}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

export default ImageUploadField;
