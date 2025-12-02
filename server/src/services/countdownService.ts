import { CountdownDays, Assignments, Users } from '../db/connection.js';
import { DEFAULT_TOTAL_DAYS } from '../config/index.js';
import { addDays, generateId, hasRewardData, hasVoucherData } from '../utils/helpers.js';
import type { DayCard, QrReward, VoucherDetail } from '../types/index.js';

export function buildDayCards(totalDays = DEFAULT_TOTAL_DAYS, cards: any[] = [], countdown: any = null): DayCard[] {
  const map = new Map((cards || []).filter(Boolean).map((card) => [card.day, card]));
  const rewardMap = new Map((countdown?.qrRewards || []).map((reward: QrReward) => [reward.day, reward]));

  return Array.from({ length: totalDays }).map((_, index) => {
    const day = index + 1;
    const base = map.get(day) || {};
    const baseType = base.type || countdown?.type || 'story';
    const type = baseType === 'qr' ? 'qr' : baseType === 'voucher' ? 'voucher' : 'story';
    let qrReward: QrReward | null = null;
    let voucherDetail: VoucherDetail | null = null;

    if (type === 'qr') {
      const source = hasRewardData(base.qrReward) ? base.qrReward : rewardMap.get(day);
      if (source) {
        qrReward = {
          title: source.title || '',
          message: source.message || '',
          imageUrl: source.imageUrl || '',
          qrCode: source.qrCode || '',
          availableOn: source.availableOn || null,
        };
      }
    }
    if (type === 'voucher') {
      const source = hasVoucherData(base.voucherDetail) ? base.voucherDetail : null;
      voucherDetail = {
        title: source?.title || '',
        message: source?.message || '',
        location: source?.location || '',
        terms: source?.terms || '',
        validUntil: source?.validUntil || null,
      };
    }

    return {
      id: base.id || null,
      day,
      title: base.title || '',
      description: base.description || '',
      coverImage: base.coverImage || '',
      type,
      cgScript: base.cgScript || null,
      qrReward,
      voucherDetail: type === 'voucher' ? voucherDetail : null,
    };
  });
}

export async function persistDayCards(
  countdownId: string,
  totalDays: number = DEFAULT_TOTAL_DAYS,
  cards: any[] = [],
  countdown: any = null
): Promise<DayCard[]> {
  if (!countdownId || !CountdownDays) return [];

  const normalized = buildDayCards(totalDays, cards, countdown);
  if (!normalized.length) return normalized;

  const timestamp = new Date();
  const operations = normalized.map((card) => ({
    updateOne: {
      filter: { countdownId, day: card.day },
      update: {
        $set: {
          countdownId,
          day: card.day,
          title: card.title,
          description: card.description,
          coverImage: card.coverImage,
          type: card.type,
          cgScript: card.cgScript || null,
          qrReward: card.type === 'qr' ? card.qrReward || null : null,
          voucherDetail: card.type === 'voucher' ? card.voucherDetail || null : null,
          updatedAt: timestamp,
        },
        $setOnInsert: {
          id: generateId('day'),
          createdAt: timestamp,
        },
      },
      upsert: true,
    },
  }));

  await CountdownDays.bulkWrite(operations, { ordered: false });
  await CountdownDays.deleteMany({ countdownId, day: { $gt: totalDays } });
  return normalized;
}

export async function attachDayCards(countdown: any): Promise<any> {
  if (!countdown || !CountdownDays) return null;
  const cards = await CountdownDays.find({ countdownId: countdown.id }).toArray();
  return { ...countdown, dayCards: buildDayCards(countdown.totalDays || DEFAULT_TOTAL_DAYS, cards, countdown) };
}

export async function attachDayCardsToMany(countdowns: any[] = []): Promise<any[]> {
  if (!countdowns.length || !CountdownDays) return [];

  const ids = countdowns.map((item) => item.id);
  const allCards = await CountdownDays.find({ countdownId: { $in: ids } }).toArray();
  const grouped = new Map();

  allCards.forEach((card) => {
    if (!grouped.has(card.countdownId)) grouped.set(card.countdownId, []);
    grouped.get(card.countdownId).push(card);
  });

  return countdowns.map((countdown) => ({
    ...countdown,
    dayCards: buildDayCards(countdown.totalDays || DEFAULT_TOTAL_DAYS, grouped.get(countdown.id) || [], countdown),
  }));
}

export function computeAvailableDay(countdown: any): number {
  if (!countdown.startDate) return countdown.totalDays || DEFAULT_TOTAL_DAYS;
  const start = new Date(countdown.startDate).getTime();
  if (Number.isNaN(start)) return countdown.totalDays || DEFAULT_TOTAL_DAYS;
  const now = Date.now();
  if (now < start) return 0;
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(countdown.totalDays || DEFAULT_TOTAL_DAYS, diff);
}

export function withAvailableContent(countdown: any, includeContent = true, focusDay?: number): any {
  const snapshot = JSON.parse(JSON.stringify(countdown));
  const availableDay = computeAvailableDay(countdown);
  snapshot.availableDay = availableDay;
  snapshot.storyMoments = countdown.storyMoments || [];
  snapshot.qrRewards = countdown.qrRewards || [];
  snapshot.voucherCards = countdown.voucherCards || [];
  snapshot.cgScript = includeContent ? (countdown.cgScript || null) : null;
  snapshot.printCards = countdown.printCards || [];
  snapshot.dayCards = buildDayCards(countdown.totalDays || DEFAULT_TOTAL_DAYS, countdown.dayCards, countdown);
  snapshot.dayCards = snapshot.dayCards.map((card: DayCard) => ({
    ...card,
    unlocked: card.day <= availableDay,
    nextUnlockAt: card.day > availableDay && countdown.startDate
      ? addDays(countdown.startDate, card.day - 1)?.toISOString()
      : undefined,
    cgScript: (includeContent || (focusDay !== undefined && card.day === focusDay)) ? card.cgScript : null,
  }));
  return snapshot;
}

export function countdownSummary(countdown: any): any {
  const availableDay = computeAvailableDay(countdown);
  const totalDays = countdown.totalDays || DEFAULT_TOTAL_DAYS;
  return {
    id: countdown.id,
    title: countdown.title,
    type: countdown.type,
    startDate: countdown.startDate,
    endDate: countdown.endDate,
    totalDays,
    availableDay,
    coverImage: countdown.coverImage,
    theme: countdown.theme,
    description: countdown.description,
    dayCards: buildDayCards(totalDays, countdown.dayCards, countdown),
  };
}

export async function ensureRecipientAssignments(countdownId: string, recipientIds: string[] = []): Promise<void> {
  if (!recipientIds.length || !Assignments) return;

  const operations = recipientIds.map((receiverId) => ({
    updateOne: {
      filter: { countdownId, receiverId },
      update: {
        $setOnInsert: {
          id: generateId('asn'),
          countdownId,
          receiverId,
          status: 'locked',
          unlockedOn: null,
        },
      },
      upsert: true,
    },
  }));

  try {
    await Assignments.bulkWrite(operations, { ordered: false });
  } catch (error: any) {
    if (error.code !== 11000) throw error;
  }
}

export async function resolveReceiverIds(recipientIds: string[] = [], recipientEmails: string[] = []): Promise<string[]> {
  if (!Users) return recipientIds;

  const uniqueIds = new Set(recipientIds || []);
  const normalizedEmails = (recipientEmails || [])
    .map((email) => email.toLowerCase())
    .filter(Boolean);

  if (normalizedEmails.length) {
    const receivers = await Users.find({ role: 'receiver', email: { $in: normalizedEmails } }, { projection: { id: 1 } }).toArray();
    receivers.forEach((receiver) => uniqueIds.add(receiver.id));
  }

  return Array.from(uniqueIds);
}
