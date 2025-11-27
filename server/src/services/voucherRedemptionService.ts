import { VoucherRedemptions } from '../db/connection.js';
import { VoucherRedemption, VoucherRedemptionStatus } from '../types/index.js';
import { generateId } from '../utils/helpers.js';

export async function getRedemptionsByCountdown(countdownId: string): Promise<VoucherRedemption[]> {
  if (!VoucherRedemptions) return [];
  const docs = await VoucherRedemptions.find({ countdownId }).toArray();
  return docs.map((doc) => ({
    id: doc.id,
    countdownId: doc.countdownId,
    assignmentId: doc.assignmentId,
    day: doc.day,
    receiverId: doc.receiverId,
    status: doc.status,
    requestedAt: doc.requestedAt,
    confirmedAt: doc.confirmedAt || null,
    rejectedAt: doc.rejectedAt || null,
    note: doc.note,
    creatorNote: doc.creatorNote,
  }));
}

export async function getRedemptionsByAssignment(assignmentId: string): Promise<VoucherRedemption[]> {
  if (!VoucherRedemptions) return [];
  const docs = await VoucherRedemptions.find({ assignmentId }).toArray();
  return docs.map((doc) => ({
    id: doc.id,
    countdownId: doc.countdownId,
    assignmentId: doc.assignmentId,
    day: doc.day,
    receiverId: doc.receiverId,
    status: doc.status,
    requestedAt: doc.requestedAt,
    confirmedAt: doc.confirmedAt || null,
    rejectedAt: doc.rejectedAt || null,
    note: doc.note,
    creatorNote: doc.creatorNote,
  }));
}

export async function getRedemption(
  countdownId: string,
  day: number,
  receiverId: string
): Promise<VoucherRedemption | null> {
  if (!VoucherRedemptions) return null;
  const doc = await VoucherRedemptions.findOne({ countdownId, day, receiverId });
  if (!doc) return null;
  return {
    id: doc.id,
    countdownId: doc.countdownId,
    assignmentId: doc.assignmentId,
    day: doc.day,
    receiverId: doc.receiverId,
    status: doc.status,
    requestedAt: doc.requestedAt,
    confirmedAt: doc.confirmedAt || null,
    rejectedAt: doc.rejectedAt || null,
    note: doc.note,
    creatorNote: doc.creatorNote,
  };
}

export async function getRedemptionById(id: string): Promise<VoucherRedemption | null> {
  if (!VoucherRedemptions) return null;
  const doc = await VoucherRedemptions.findOne({ id });
  if (!doc) return null;
  return {
    id: doc.id,
    countdownId: doc.countdownId,
    assignmentId: doc.assignmentId,
    day: doc.day,
    receiverId: doc.receiverId,
    status: doc.status,
    requestedAt: doc.requestedAt,
    confirmedAt: doc.confirmedAt || null,
    rejectedAt: doc.rejectedAt || null,
    note: doc.note,
    creatorNote: doc.creatorNote,
  };
}

export async function requestRedemption(
  countdownId: string,
  assignmentId: string,
  day: number,
  receiverId: string,
  note?: string
): Promise<VoucherRedemption> {
  if (!VoucherRedemptions) throw new Error('Database not initialized');

  // 檢查是否已經有兌換請求
  const existing = await VoucherRedemptions.findOne({ countdownId, day, receiverId });
  if (existing) {
    // 如果已經有請求，返回現有的
    return {
      id: existing.id,
      countdownId: existing.countdownId,
      assignmentId: existing.assignmentId,
      day: existing.day,
      receiverId: existing.receiverId,
      status: existing.status,
      requestedAt: existing.requestedAt,
      confirmedAt: existing.confirmedAt || null,
      rejectedAt: existing.rejectedAt || null,
      note: existing.note,
      creatorNote: existing.creatorNote,
    };
  }

  const redemption: VoucherRedemption = {
    id: generateId('vr'),
    countdownId,
    assignmentId,
    day,
    receiverId,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    confirmedAt: null,
    rejectedAt: null,
    note: note || undefined,
  };

  await VoucherRedemptions.insertOne(redemption);
  return redemption;
}

export async function confirmRedemption(
  id: string,
  creatorNote?: string
): Promise<VoucherRedemption | null> {
  if (!VoucherRedemptions) return null;

  const existing = await VoucherRedemptions.findOne({ id });
  if (!existing) return null;

  if (existing.status !== 'pending') {
    // 已經處理過，返回現有狀態
    return {
      id: existing.id,
      countdownId: existing.countdownId,
      assignmentId: existing.assignmentId,
      day: existing.day,
      receiverId: existing.receiverId,
      status: existing.status,
      requestedAt: existing.requestedAt,
      confirmedAt: existing.confirmedAt || null,
      rejectedAt: existing.rejectedAt || null,
      note: existing.note,
      creatorNote: existing.creatorNote,
    };
  }

  const update: any = {
    status: 'confirmed' as VoucherRedemptionStatus,
    confirmedAt: new Date().toISOString(),
  };
  if (creatorNote) {
    update.creatorNote = creatorNote;
  }

  await VoucherRedemptions.updateOne({ id }, { $set: update });

  return {
    ...existing,
    ...update,
    id: existing.id,
    countdownId: existing.countdownId,
    assignmentId: existing.assignmentId,
    day: existing.day,
    receiverId: existing.receiverId,
    requestedAt: existing.requestedAt,
    note: existing.note,
  };
}

export async function rejectRedemption(
  id: string,
  creatorNote?: string
): Promise<VoucherRedemption | null> {
  if (!VoucherRedemptions) return null;

  const existing = await VoucherRedemptions.findOne({ id });
  if (!existing) return null;

  if (existing.status !== 'pending') {
    // 已經處理過，返回現有狀態
    return {
      id: existing.id,
      countdownId: existing.countdownId,
      assignmentId: existing.assignmentId,
      day: existing.day,
      receiverId: existing.receiverId,
      status: existing.status,
      requestedAt: existing.requestedAt,
      confirmedAt: existing.confirmedAt || null,
      rejectedAt: existing.rejectedAt || null,
      note: existing.note,
      creatorNote: existing.creatorNote,
    };
  }

  const update: any = {
    status: 'rejected' as VoucherRedemptionStatus,
    rejectedAt: new Date().toISOString(),
  };
  if (creatorNote) {
    update.creatorNote = creatorNote;
  }

  await VoucherRedemptions.updateOne({ id }, { $set: update });

  return {
    ...existing,
    ...update,
    id: existing.id,
    countdownId: existing.countdownId,
    assignmentId: existing.assignmentId,
    day: existing.day,
    receiverId: existing.receiverId,
    requestedAt: existing.requestedAt,
    note: existing.note,
  };
}

export async function getPendingRedemptionsCount(countdownId: string): Promise<number> {
  if (!VoucherRedemptions) return 0;
  return await VoucherRedemptions.countDocuments({ countdownId, status: 'pending' });
}

