import { DEFAULT_TOTAL_DAYS } from '../config/index.js';
import { VoucherCards } from '../db/connection.js';
import { generateId } from '../utils/helpers.js';
import type { VoucherCard } from '../types/index.js';

const DEFAULT_ACCENT = '#fbbf24';

function ensureTemplate(value?: string): string {
  return value || 'voucher-default';
}

function normalizeField(value?: string): string {
  return (value || '').toString().trim();
}

function buildCard(day: number, doc?: any, countdownId?: string): VoucherCard {
  return {
    id: doc?.id || null,
    countdownId: doc?.countdownId || countdownId || '',
    day,
    template: ensureTemplate(doc?.template),
    imageUrl: normalizeField(doc?.imageUrl),
    title: normalizeField(doc?.title) || `Day ${day} Voucher`,
    subtitle: normalizeField(doc?.subtitle),
    note: normalizeField(doc?.note),
    accentColor: normalizeField(doc?.accentColor) || DEFAULT_ACCENT,
    isConfigured: Boolean(doc?.canvasJson || doc?.previewImage || doc),
    canvasJson: doc?.canvasJson || null,
    previewImage: doc?.previewImage || '',
  };
}

export async function getVoucherCards(countdownId: string, totalDays = DEFAULT_TOTAL_DAYS): Promise<VoucherCard[]> {
  if (!VoucherCards || !countdownId) return [];
  const docs = await VoucherCards.find({ countdownId }).toArray();
  const map = new Map(docs.map((doc) => [doc.day, doc]));
  return Array.from({ length: totalDays }).map((_, index) => {
    const day = index + 1;
    return buildCard(day, map.get(day), countdownId);
  });
}

export async function getVoucherCard(countdownId: string, day: number): Promise<VoucherCard | null> {
  if (!VoucherCards) return null;
  const doc = await VoucherCards.findOne({ countdownId, day });
  if (!doc) {
    return buildCard(day, undefined, countdownId);
  }
  return buildCard(day, doc);
}

export async function saveVoucherCard(
  countdownId: string,
  day: number,
  payload: Partial<VoucherCard> = {},
): Promise<VoucherCard | null> {
  if (!VoucherCards || !countdownId || !day) return null;
  const timestamp = new Date();
  const record = {
    countdownId,
    day,
    template: ensureTemplate(payload.template),
    imageUrl: normalizeField(payload.imageUrl),
    title: normalizeField(payload.title) || `Day ${day} Voucher`,
    subtitle: normalizeField(payload.subtitle),
    note: normalizeField(payload.note),
    accentColor: normalizeField(payload.accentColor) || DEFAULT_ACCENT,
    canvasJson: payload.canvasJson || null,
    previewImage: payload.previewImage || '',
    updatedAt: timestamp,
  };

  await VoucherCards.updateOne(
    { countdownId, day },
    {
      $set: record,
      $setOnInsert: {
        id: generateId('vc'),
        createdAt: timestamp,
      },
    },
    { upsert: true },
  );

  return getVoucherCard(countdownId, day);
}

export async function deleteVoucherCard(countdownId: string, day: number): Promise<VoucherCard | null> {
  if (!VoucherCards || !countdownId || !day) return null;
  await VoucherCards.deleteOne({ countdownId, day });
  return buildCard(day, undefined, countdownId);
}
