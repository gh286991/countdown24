import { JellyTriangle } from '@uiball/loaders';
import type { FC } from 'react';

interface CuteLoadingSpinnerProps {
  label?: string;
}

const CuteLoadingSpinner: FC<CuteLoadingSpinnerProps> = ({ label = '載入倒數內容...' }) => {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-[#ffe9b3]" aria-live="polite" aria-busy="true">
      <JellyTriangle size={100} speed={0.9} color="#ffe9b3" />
      <div className="text-center space-y-1 drop-shadow-[0_6px_25px_rgba(255,233,179,0.35)]">
        <p className="text-sm font-semibold tracking-wide">{label}</p>
        <p className="text-xs text-[#ffefc8]">星屑正在為禮物天空增添光芒</p>
      </div>
    </div>
  );
};

export default CuteLoadingSpinner;
