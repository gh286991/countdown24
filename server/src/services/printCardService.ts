import { DEFAULT_TOTAL_DAYS } from '../config/index';
import { PrintCards } from '../db/connection';
import { generateId } from '../utils/helpers';
import type { PrintCard, PrintCardTemplate } from '../types/index';

export const PRINT_CARD_TEMPLATES: PrintCardTemplate[] = ['imageLeft', 'imageRight', 'stacked', 'spotlight'];

const DEFAULT_ACCENT = '#f472b6';

function ensureTemplate(value?: string): PrintCardTemplate {
  if (value && PRINT_CARD_TEMPLATES.includes(value as PrintCardTemplate)) {
    return value as PrintCardTemplate;
  }
  return 'imageLeft';
}

function normalizeField(value?: string): string {
  return (value || '').toString().trim();
}

function buildCard(day: number, doc?: any, countdownId?: string): PrintCard {
  return {
    id: doc?.id || null,
    countdownId: doc?.countdownId || countdownId || '',
    day,
    template: ensureTemplate(doc?.template),
    imageUrl: normalizeField(doc?.imageUrl),
    qrCode: normalizeField(doc?.qrCode),
    title: normalizeField(doc?.title) || `Day ${day}`,
  subtitle: normalizeField(doc?.subtitle),
  note: normalizeField(doc?.note),
  accentColor: normalizeField(doc?.accentColor) || DEFAULT_ACCENT,
  isConfigured: Boolean(doc?.canvasJson || doc?.previewImage || doc),
  canvasJson: doc?.canvasJson || null,
  previewImage: doc?.previewImage || '',
  };
}

export async function getPrintCards(countdownId: string, totalDays = DEFAULT_TOTAL_DAYS): Promise<PrintCard[]> {
  if (!PrintCards || !countdownId) return [];
  const docs = await PrintCards.find({ countdownId }).toArray();
  const map = new Map(docs.map((doc) => [doc.day, doc]));
  return Array.from({ length: totalDays }).map((_, index) => {
    const day = index + 1;
    return buildCard(day, map.get(day), countdownId);
  });
}

export async function getPrintCard(countdownId: string, day: number): Promise<PrintCard | null> {
  if (!PrintCards) return null;
  const doc = await PrintCards.findOne({ countdownId, day });
  if (!doc) {
    return buildCard(day, undefined, countdownId);
  }
  return buildCard(day, doc);
}

export async function savePrintCard(
  countdownId: string,
  day: number,
  payload: Partial<PrintCard> = {},
): Promise<PrintCard | null> {
  if (!PrintCards || !countdownId || !day) return null;
  const timestamp = new Date();
  const record = {
    countdownId,
    day,
    template: ensureTemplate(payload.template),
    imageUrl: normalizeField(payload.imageUrl),
    qrCode: normalizeField(payload.qrCode),
    title: normalizeField(payload.title) || `Day ${day}`,
    subtitle: normalizeField(payload.subtitle),
    note: normalizeField(payload.note),
    accentColor: normalizeField(payload.accentColor) || DEFAULT_ACCENT,
    canvasJson: payload.canvasJson || null,
    previewImage: payload.previewImage || '',
    updatedAt: timestamp,
  };

  await PrintCards.updateOne(
    { countdownId, day },
    {
      $set: record,
      $setOnInsert: {
        id: generateId('pc'),
        createdAt: timestamp,
      },
    },
    { upsert: true },
  );

  return getPrintCard(countdownId, day);
}

export async function deletePrintCard(countdownId: string, day: number): Promise<PrintCard | null> {
  if (!PrintCards || !countdownId || !day) return null;
  await PrintCards.deleteOne({ countdownId, day });
  return buildCard(day, undefined, countdownId);
}
