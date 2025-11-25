import { useEffect, ReactElement } from 'react';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineInformationCircle, HiOutlineExclamationTriangle } from 'react-icons/hi2';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastStyle {
  bg: string;
  border: string;
  text: string;
  icon: ReactElement;
}

const toastStyles: Record<ToastType, ToastStyle> = {
  success: {
    bg: 'bg-christmas-green',
    border: 'border-christmas-green/30',
    text: 'text-white',
    icon: <HiOutlineCheckCircle className="w-6 h-6 text-white" />,
  },
  error: {
    bg: 'bg-christmas-red',
    border: 'border-christmas-red/30',
    text: 'text-white',
    icon: <HiOutlineXCircle className="w-6 h-6 text-white" />,
  },
  info: {
    bg: 'bg-blue-600',
    border: 'border-blue-500/30',
    text: 'text-white',
    icon: <HiOutlineInformationCircle className="w-6 h-6 text-white" />,
  },
  warning: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-400/30',
    text: 'text-slate-900',
    icon: <HiOutlineExclamationTriangle className="w-6 h-6 text-slate-900" />,
  },
};

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const style = toastStyles[type];

  return (
    <div className="animate-slide-in-right">
      <div
        className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 shadow-2xl min-w-[320px] max-w-md ${style.bg} ${style.border} ${style.text}`}
      >
        <div className="flex-shrink-0">{style.icon}</div>
        <p className={`flex-1 text-sm font-semibold leading-relaxed ${style.text}`}>{message}</p>
        <button
          type="button"
          onClick={onClose}
          className={`flex-shrink-0 hover:opacity-70 transition-opacity ${style.text}`}
        >
          <HiOutlineXCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default Toast;

