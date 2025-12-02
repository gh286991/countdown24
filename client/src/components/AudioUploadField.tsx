import { useRef, useState } from 'react';
import { HiOutlineCloudArrowUp, HiOutlineMusicalNote } from 'react-icons/hi2';
import api from '../api/client';
import { useToast } from './ToastProvider';
import AssetLibraryModal from './AssetLibraryModal';
import type { UserAsset } from '../types/assets';

interface AudioUploadFieldProps {
    label?: string;
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    folder?: string;
    helperText?: string;
    className?: string;
}

function AudioUploadField({
    label,
    value,
    onChange,
    placeholder,
    folder,
    helperText,
    className,
}: AudioUploadFieldProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const { showToast } = useToast();

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            showToast('請上傳音訊檔案', 'error');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (folder) {
                formData.append('folder', folder);
            }
            formData.append('usePresigned', 'true');

            const { data } = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const nextValue = data.originalUrl || data.url;
            onChange(nextValue);
            showToast('音訊上傳成功', 'success');
        } catch (error: any) {
            console.error('Upload failed', error);
            showToast(error?.response?.data?.message || '音訊上傳失敗', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={className}>
            {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
            <div className="flex gap-2 items-start">
                <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 border border-white/10 flex items-center gap-2 overflow-hidden">
                    <HiOutlineMusicalNote className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || '音訊網址'}
                        className="flex-1 bg-transparent text-sm focus:outline-none text-gray-200"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-xs flex items-center gap-1 text-gray-200 hover:bg-white/20 disabled:opacity-50"
                    >
                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                        {uploading ? '上傳中...' : '上傳'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowLibraryModal(true)}
                        className="px-3 py-2 rounded-lg border border-dashed border-white/20 text-xs text-gray-300 hover:border-white/40"
                    >
                        我的素材庫
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
            {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
            {value && (
                <div className="mt-2">
                    <audio controls src={value} className="w-full h-8" />
                </div>
            )}
            <AssetLibraryModal
                isOpen={showLibraryModal}
                onClose={() => setShowLibraryModal(false)}
                onSelect={(asset: UserAsset) => {
                    onChange(asset.originalUrl || asset.url);
                    showToast('已套用素材庫音訊', 'success');
                    setShowLibraryModal(false);
                }}
                allowedTypes={['audio']}
            />
        </div>
    );
}

export default AudioUploadField;
