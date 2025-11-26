import { QRCodeSVG } from 'qrcode.react';
import { PresignedImage } from './PresignedImage';
import type { PrintCard, PrintCardTemplate } from '../store/countdownSlice';

interface PrintCardPreviewProps {
  card: Partial<PrintCard> & { day: number };
  variant?: 'preview' | 'print' | 'voucher';
}

const clampText = (value: string, limit = 180) => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
};

function PrintCardPreview({ card, variant = 'preview' }: PrintCardPreviewProps) {
  const isPrint = variant === 'print';
  const isVoucher = variant === 'voucher';
  const templateKey = (isVoucher ? 'imageLeft' : card.template || 'imageLeft') as PrintCardTemplate;
  const accentColor = card.accentColor || '#f472b6';
  const title = card.title || `Day ${card.day}`;
  const subtitle = card.subtitle || '在這裡寫一句給接收者的話';
  const note = clampText(card.note || '小提醒或備註內容');
  const qrSize = isPrint ? 280 : 130;

  const wrapperClass = [
    'rounded-[28px]',
    'border',
    'flex',
    'flex-col',
    'p-4',
    isPrint ? 'print-card bg-white border-slate-200 shadow-lg' : 'bg-slate-50/90 border-white/40 min-h-[360px]',
  ]
    .filter(Boolean)
    .join(' ');

  const templateWrapperClass = [
    'flex-1',
    'flex',
    'flex-col',
    isPrint ? 'print-card__template' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const imageWrapperClass = isPrint
    ? 'print-card__media'
    : 'rounded-2xl overflow-hidden bg-white h-48';
  const compactImageWrapperClass = isPrint
    ? 'print-card__media'
    : 'rounded-3xl overflow-hidden border border-white h-44';

  const qrWrapperClass = [
    'rounded-2xl',
    'bg-white',
    'shadow-sm',
    'inline-flex',
    'items-center',
    'justify-center',
    isPrint ? 'print-card__qr' : 'p-3 w-[140px] h-[140px]',
  ]
    .filter(Boolean)
    .join(' ');

  const noteClass = isPrint
    ? 'print-card__note line-clamp-2'
    : 'text-sm text-slate-600 line-clamp-2';

  const qrPlaceholderClass = [
    'border-2',
    'border-dashed',
    'border-slate-300',
    'text-[10px]',
    'text-slate-400',
  ]
    .filter(Boolean)
    .join(' ');

  const imageElement = card.imageUrl ? (
    <PresignedImage src={card.imageUrl} alt={title} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px]">
      加入圖片
    </div>
  );

  const qrElement = !isVoucher
    ? card.qrCode
      ? (
        <div className={qrWrapperClass}>
          <QRCodeSVG value={card.qrCode} size={qrSize} />
        </div>
      )
      : (
        <div className={`${qrWrapperClass} ${qrPlaceholderClass}`}>禮品卡</div>
      )
    : (
      <div className={`${qrWrapperClass} bg-white/80 border border-slate-200 text-[11px] text-slate-500`}>
        可放簽名或貼紙
      </div>
    );

  const heading = (
    <>
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Day {card.day}</p>
      <h4 className="text-lg font-semibold text-slate-900 leading-tight line-clamp-2">{title}</h4>
      <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">{subtitle}</p>
    </>
  );

  const noteBlock = (
    <div className={noteClass}>
      {note}
    </div>
  );

  const sharedMedia = (
    <div className={imageWrapperClass}>{imageElement}</div>
  );

  const stackedMedia = (
    <div className={compactImageWrapperClass}>{imageElement}</div>
  );

  const spotlightBackdrop = (
    <div className="absolute inset-0 opacity-30 mix-blend-multiply">
      {card.imageUrl ? (
        <PresignedImage src={card.imageUrl} alt={title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-white/20" />
      )}
    </div>
  );

  const templates: Record<PrintCardTemplate, JSX.Element> = {
    imageLeft: (
      <div className="flex flex-col flex-1">
        <div className="grid grid-cols-[3fr_2fr] gap-3 flex-1 overflow-hidden">
          <div className="overflow-hidden">{sharedMedia}</div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col justify-between">
            <div className="space-y-2">{heading}</div>
            {qrElement}
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 px-4 py-2 mt-3 flex items-center">
          {noteBlock}
        </div>
      </div>
    ),
    imageRight: (
      <div className="flex flex-col flex-1">
        <div className="grid grid-cols-[2fr_3fr] gap-3 flex-1 overflow-hidden">
          <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col justify-between">
            <div className="space-y-2">{heading}</div>
            {qrElement}
          </div>
          <div className="overflow-hidden">{sharedMedia}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-2 mt-3 text-white/90 flex items-center">
          {noteBlock}
        </div>
      </div>
    ),
    stacked: (
      <div className="flex flex-col flex-1">
        <div className="rounded-3xl border border-slate-200 bg-white flex-1 overflow-hidden grid grid-rows-[2fr_1fr]">
          <div className="overflow-hidden">{stackedMedia}</div>
          <div className="bg-white px-4 py-3 grid grid-cols-[3fr_1fr] gap-3 items-center">
            <div className="space-y-2">{heading}</div>
            {qrElement}
          </div>
        </div>
        <div className="text-sm text-slate-600 px-1 py-2 mt-2">
          <div className="line-clamp-1">{note}</div>
        </div>
      </div>
    ),
    spotlight: (
      <div className="flex flex-col flex-1">
        <div className="relative rounded-3xl border border-slate-200 flex-1 overflow-hidden" style={{ background: accentColor }}>
          {spotlightBackdrop}
          <div className="relative z-10 h-full flex flex-col text-white p-4 space-y-3">
            <span className="text-xs uppercase tracking-[0.4em]">Day {card.day}</span>
            <h4 className="text-xl font-bold leading-tight line-clamp-2">{title}</h4>
            <p className="text-sm text-white/80 line-clamp-2">{subtitle}</p>
            <p className="text-xs text-white/70 line-clamp-2">{note}</p>
            <div className="mt-auto self-end">{qrElement}</div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className={wrapperClass}>
      <div className={templateWrapperClass}>{templates[templateKey]}</div>
    </div>
  );
}

export default PrintCardPreview;
