import { HiOutlineExclamationTriangle, HiOutlineXMark } from 'react-icons/hi2';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '確定',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl border border-white/10">
        <button
          type="button"
          className="absolute top-3 right-3 text-sm text-gray-400 hover:text-white"
          onClick={onCancel}
        >
          <HiOutlineXMark className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <HiOutlineExclamationTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-sm text-gray-300">{message}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-christmas-red/90 hover:bg-christmas-red rounded-lg text-white font-semibold transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

