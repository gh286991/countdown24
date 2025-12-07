import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Countdowns, Assignments, CountdownDays, Users, Invitations } from '../db/connection.js';
import * as countdownService from '../services/countdownService.js';
import * as printCardService from '../services/printCardService.js';
import * as voucherCardService from '../services/voucherCardService.js';
import * as voucherRedemptionService from '../services/voucherRedemptionService.js';
import { normalizeDate, normalizeTotalDays, addDays, generateId, generateDayQrToken } from '../utils/helpers.js';
import crypto from 'crypto';

export async function getCountdowns(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !Assignments) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role === 'creator') {
    const owned = await Countdowns.find({ ownerId: req.user.id }).toArray();
    const hydrated = await countdownService.attachDayCardsToMany(owned);
    return res.json({ items: hydrated.map(countdownService.countdownSummary) });
  }

  const assignments = await Assignments.find({ receiverId: req.user.id }).toArray();
  const countdownIds = assignments.map((assignment) => assignment.countdownId);
  const countdownDocs = await Countdowns.find({ id: { $in: countdownIds } }).toArray();
  const hydrated = await countdownService.attachDayCardsToMany(countdownDocs);
  const map = new Map(hydrated.map((doc) => [doc.id, doc]));
  const items = assignments
    .map((assignment) => {
      const countdown = map.get(assignment.countdownId);
      if (!countdown) return null;
      return {
        assignmentId: assignment.id,
        status: assignment.status,
        unlockedOn: assignment.unlockedOn,
        countdown: countdownService.countdownSummary(countdown),
      };
    })
    .filter(Boolean);

  return res.json({ items });
}

export async function getCountdownById(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !Assignments) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const countdownWithCards = await countdownService.attachDayCards(countdown);

  if (req.user.role === 'creator' && countdown.ownerId !== req.user.id) {
    return res.status(403).json({ message: 'Not allowed to view this countdown' });
  }

  if (req.user.role === 'receiver') {
    const assignment = await Assignments.findOne({ countdownId: id, receiverId: req.user.id });
    if (!assignment) {
      return res.status(403).json({ message: 'Countdown not shared with this receiver' });
    }
  }

  const isOwner = req.user.role === 'creator' && countdown.ownerId === req.user.id;
  const voucherCards = await voucherCardService.getVoucherCards(countdown.id, countdown.totalDays);
  const countdownPayload = {
    ...countdownWithCards,
    // printCards intentionally excluded here to avoid large canvasJson payloads; fetch separately when needed
    voucherCards,
  };

  const dayParam = req.query.day ? Number(req.query.day) : undefined;
  const includeContent = isOwner;
  const payload: any = {
    countdown: countdownService.withAvailableContent(countdownPayload, includeContent, dayParam),
  };
  if (isOwner) {
    payload.assignments = await Assignments.find({ countdownId: countdown.id }).toArray();
  }
  return res.json(payload);
}

export async function getPrintCardByDay(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, day } = req.params;
  const countdown = await Countdowns.findOne({ id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  if (req.user.role !== 'creator' || countdown.ownerId !== req.user.id) {
    return res.status(403).json({ message: 'Not allowed to view this countdown' });
  }

  const dayNumber = Number(day);
  if (!dayNumber || dayNumber < 1) {
    return res.status(400).json({ message: 'Invalid day' });
  }

  const card = await printCardService.getPrintCard(countdown.id, dayNumber);
  return res.json({ card });
}

export async function createCountdown(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const payload = req.body || {};
  if (!payload.title) {
    return res.status(400).json({ message: 'Countdown title is required' });
  }

  const recipientIds = await countdownService.resolveReceiverIds(payload.recipientIds, payload.recipientEmails);
  const normalizedStartDate = normalizeDate(payload.startDate, new Date().toISOString());
  const totalDays = normalizeTotalDays(payload.totalDays);
  const normalizedEndDate = normalizedStartDate
    ? (addDays(normalizedStartDate, totalDays - 1)?.toISOString() || normalizedStartDate)
    : normalizedStartDate;

  const newCountdown = {
    id: generateId('cd'),
    ownerId: req.user.id!,
    title: payload.title,
    type: payload.type || 'story',
    description: payload.description || '',
    coverImage: payload.coverImage || 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70',
    theme: payload.theme || { primary: '#f472b6', secondary: '#22d3ee' },
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    totalDays,
    storyMoments: (payload.storyMoments || [])
      .map((moment: any) => ({
        ...moment,
        availableOn: normalizedStartDate
          ? normalizeDate(moment.availableOn, addDays(normalizedStartDate, (moment.day || 1) - 1)?.toISOString() || undefined)
          : normalizeDate(moment.availableOn),
      }))
      .filter((moment: any) => moment.day >= 1 && moment.day <= totalDays),
    qrRewards: (payload.qrRewards || [])
      .map((reward: any) => ({
        ...reward,
        availableOn: normalizedStartDate
          ? normalizeDate(reward.availableOn, addDays(normalizedStartDate, (reward.day || 1) - 1)?.toISOString() || undefined)
          : normalizeDate(reward.availableOn),
      }))
      .filter((reward: any) => reward.day >= 1 && reward.day <= totalDays),
    cgScript: payload.cgScript || null,
    recipientIds,
  };

  await Countdowns.insertOne(newCountdown);
  await countdownService.persistDayCards(newCountdown.id, totalDays, payload.dayCards || [], newCountdown);
  await countdownService.ensureRecipientAssignments(newCountdown.id, newCountdown.recipientIds);
  const hydrated = await countdownService.attachDayCards(newCountdown);
  return res.status(201).json({ countdown: countdownService.countdownSummary(hydrated) });
}

export async function updateCountdown(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const countdownWithCards = await countdownService.attachDayCards(countdown);
  const updates = req.body || {};
  const updatedRecipients = await countdownService.resolveReceiverIds(
    updates.recipientIds || countdown.recipientIds,
    updates.recipientEmails
  );
  const nextStartDate = updates.startDate ? normalizeDate(updates.startDate, countdown.startDate) : countdown.startDate;
  const nextTotalDays = updates.totalDays ? normalizeTotalDays(updates.totalDays) : countdown.totalDays;
  const nextEndDate = updates.endDate
    ? normalizeDate(updates.endDate, countdown.endDate)
    : (nextStartDate ? (addDays(nextStartDate, nextTotalDays - 1)?.toISOString() || countdown.endDate) : countdown.endDate);

  const nextCountdown = {
    ...countdown,
    title: updates.title ?? countdown.title,
    description: updates.description ?? countdown.description,
    coverImage: updates.coverImage ?? countdown.coverImage,
    theme: updates.theme ?? countdown.theme,
    startDate: nextStartDate,
    endDate: nextEndDate,
    totalDays: nextTotalDays,
    type: updates.type ?? countdown.type,
    storyMoments: (updates.storyMoments || countdown.storyMoments || [])
      .map((moment: any) => ({
        ...moment,
        availableOn: nextStartDate
          ? normalizeDate(moment.availableOn, addDays(nextStartDate, (moment.day || 1) - 1)?.toISOString() || undefined)
          : normalizeDate(moment.availableOn),
      }))
      .filter((moment: any) => moment.day >= 1 && moment.day <= nextTotalDays),
    qrRewards: (updates.qrRewards || countdown.qrRewards || [])
      .map((reward: any) => ({
        ...reward,
        availableOn: nextStartDate
          ? normalizeDate(reward.availableOn, addDays(nextStartDate, (reward.day || 1) - 1)?.toISOString() || undefined)
          : normalizeDate(reward.availableOn),
      }))
      .filter((reward: any) => reward.day >= 1 && reward.day <= nextTotalDays),
    cgScript: updates.cgScript ?? countdown.cgScript ?? null,
    recipientIds: updatedRecipients,
  };

  const record: any = { ...nextCountdown };
  delete record.dayCards;

  await Countdowns.updateOne({ id }, { $set: record });

  // 合併更新：如果只帶了部分 dayCards，就把其餘既有資料保留，避免被空值覆蓋
  const baseDayCards = countdownWithCards.dayCards || [];
  const incomingCards = updates.dayCards || [];
  const mergedDayCards = (() => {
    if (!incomingCards.length) return baseDayCards;
    const map = new Map(baseDayCards.map((card: any) => [card.day, card]));
    incomingCards.forEach((card: any) => {
      if (!card || typeof card.day !== 'number') return;
      const existing = map.get(card.day) || {};
      map.set(card.day, { ...existing, ...card });
    });
    return Array.from(map.values());
  })();

  const nextDayCards = await countdownService.persistDayCards(
    id,
    nextTotalDays,
    mergedDayCards,
    nextCountdown,
  );
  await countdownService.ensureRecipientAssignments(id, updatedRecipients);

  const printCards = await printCardService.getPrintCards(id, nextTotalDays);
  const voucherCards = await voucherCardService.getVoucherCards(id, nextTotalDays);
  const responseCountdown = { ...nextCountdown, dayCards: nextDayCards, printCards, voucherCards };
  return res.json({ countdown: countdownService.withAvailableContent(responseCountdown) });
}

export async function deleteCountdown(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !Assignments) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  await Countdowns.deleteOne({ id });
  await Assignments.deleteMany({ countdownId: id });
  if (CountdownDays) {
    await CountdownDays.deleteMany({ countdownId: id });
  }

  return res.json({ id });
}

export async function assignReceivers(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !Assignments) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const countdownWithCards = await countdownService.attachDayCards(countdown);
  const { receiverIds = [], receiverEmails = [] } = req.body || {};
  const validReceivers = await countdownService.resolveReceiverIds(receiverIds, receiverEmails);

  if (!validReceivers.length) {
    return res.status(400).json({ message: 'No valid receivers found' });
  }

  const mergedRecipients = Array.from(new Set([...(countdown.recipientIds || []), ...validReceivers]));
  await Countdowns.updateOne({ id }, { $set: { recipientIds: mergedRecipients } });
  await countdownService.ensureRecipientAssignments(countdown.id, validReceivers);
  const assigned = await Assignments.find({ countdownId: countdown.id }).toArray();

  return res.json({
    countdown: countdownService.countdownSummary({ ...countdownWithCards, recipientIds: mergedRecipients }),
    assignments: assigned,
  });
}

export async function getReceivers(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !Assignments || !Users) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const assignments = await Assignments.find({ countdownId: countdown.id }).toArray();

  // 獲取接收者的完整用戶資訊
  const receiverIds = assignments.map((assignment) => assignment.receiverId);
  const users = await Users.find({ id: { $in: receiverIds } }).toArray();
  const userMap = new Map(users.map((user) => [user.id, user]));

  // 合併 assignment 和用戶資訊
  const receiversWithInfo = assignments.map((assignment) => {
    const user = userMap.get(assignment.receiverId);
    return {
      id: assignment.id,
      receiverId: assignment.receiverId,
      status: assignment.status,
      unlockedOn: assignment.unlockedOn,
      user: user ? {
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      } : null,
    };
  });

  return res.json({ receivers: receiversWithInfo });
}

export async function removeReceiver(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !Assignments) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, receiverId } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // 從 recipientIds 中移除
  const updatedRecipients = (countdown.recipientIds || []).filter((rid: string) => rid !== receiverId);
  await Countdowns.updateOne({ id }, { $set: { recipientIds: updatedRecipients } });

  // 刪除對應的 assignment
  await Assignments.deleteOne({ countdownId: id, receiverId });

  return res.json({ message: 'Receiver removed successfully' });
}

// 生成邀請連結
export async function createInvitation(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !Invitations) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params; // countdownId
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // 生成隨機 token
  const token = crypto.randomBytes(32).toString('hex');
  const invitation = {
    id: generateId('inv'),
    token,
    countdownId: id,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    status: 'active', // active, used, expired
    usedBy: null,
    usedAt: null,
  };

  await Invitations.insertOne(invitation);

  return res.json({
    invitation: {
      id: invitation.id,
      token: invitation.token,
      inviteUrl: `/invite/${invitation.token}`,
    }
  });
}

// 檢查邀請有效性（公開 API，不需要登入）
export async function checkInvitation(req: Request, res: Response) {
  if (!Invitations || !Countdowns) {
    return res.status(500).json({ message: 'Database not initialized' });
  }

  const { token } = req.params;
  const invitation = await Invitations.findOne({ token });

  if (!invitation) {
    return res.status(404).json({ message: 'Invitation not found', valid: false });
  }

  if (invitation.status !== 'active') {
    return res.json({
      message: 'Invitation already used or expired',
      valid: false,
      status: invitation.status
    });
  }

  // 獲取倒數專案資訊
  const countdown = await Countdowns.findOne({ id: invitation.countdownId });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found', valid: false });
  }

  return res.json({
    valid: true,
    countdown: {
      id: countdown.id,
      title: countdown.title,
      coverImage: countdown.coverImage,
    }
  });
}

// 接受邀請（綁定到倒數專案）
export async function acceptInvitation(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Invitations || !Countdowns || !Assignments) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { token } = req.params;
  const invitation = await Invitations.findOne({ token, status: 'active' });

  if (!invitation) {
    return res.status(404).json({ message: 'Invitation not found or already used' });
  }

  // 檢查倒數專案是否存在
  const countdown = await Countdowns.findOne({ id: invitation.countdownId });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // 檢查是否已經綁定
  const existingAssignment = await Assignments.findOne({
    countdownId: invitation.countdownId,
    receiverId: req.user.id
  });

  if (existingAssignment) {
    // 已經綁定，更新邀請狀態
    await Invitations.updateOne(
      { token },
      { $set: { status: 'used', usedBy: req.user.id, usedAt: new Date().toISOString() } }
    );
    return res.json({
      message: 'Already assigned',
      assignment: existingAssignment
    });
  }

  // 建立新的 assignment
  const assignment = {
    id: generateId('asgn'),
    countdownId: invitation.countdownId,
    receiverId: req.user.id,
    status: 'active',
    unlockedOn: new Date().toISOString(),
  };

  await Assignments.insertOne(assignment);

  // 更新倒數專案的 recipientIds
  const recipientIds = countdown.recipientIds || [];
  if (!recipientIds.includes(req.user.id)) {
    recipientIds.push(req.user.id);
    await Countdowns.updateOne(
      { id: invitation.countdownId },
      { $set: { recipientIds } }
    );
  }

  // 更新邀請狀態
  await Invitations.updateOne(
    { token },
    { $set: { status: 'used', usedBy: req.user.id, usedAt: new Date().toISOString() } }
  );

  return res.json({
    message: 'Invitation accepted',
    assignment
  });
}

// 生成每天的 QR code token
export async function generateDayQrCode(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params; // countdownId
  const { day } = req.body;

  if (!day || !Number.isFinite(Number(day)) || Number(day) < 1) {
    return res.status(400).json({ message: 'Invalid day parameter' });
  }

  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const totalDays = countdown.totalDays || 24;
  if (Number(day) > totalDays) {
    return res.status(400).json({ message: 'Day exceeds total days' });
  }

  const qrToken = generateDayQrToken(countdown.id, Number(day));
  const qrUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/scan/${qrToken}`;

  return res.json({
    day: Number(day),
    qrToken,
    qrUrl,
  });
}

export async function getPrintCardsForCountdown(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const cards = await printCardService.getPrintCards(id, countdown.totalDays);
  return res.json({ cards });
}

export async function exportPrintCardImages(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const cards = await printCardService.getPrintCards(id, countdown.totalDays);
  // 僅回傳列印需要的欄位，避免載入過多 canvasJson
  const payload = cards.map((card) => ({
    day: card.day,
    title: card.title,
    subtitle: card.subtitle,
    template: card.template,
    isConfigured: card.isConfigured,
    previewImage: card.previewImage || '',
  }));

  return res.json({ cards: payload });
}

export async function savePrintCard(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, day: dayParam } = req.params;
  const day = Number(dayParam);
  if (!day || Number.isNaN(day) || day < 1) {
    return res.status(400).json({ message: 'Invalid day parameter' });
  }

  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }
  if (day > (countdown.totalDays || 24)) {
    return res.status(400).json({ message: 'Day exceeds total days' });
  }

  const card = await printCardService.savePrintCard(id, day, req.body || {});
  const cards = await printCardService.getPrintCards(id, countdown.totalDays);
  return res.json({ card, cards });
}

export async function deletePrintCard(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, day: dayParam } = req.params;
  const day = Number(dayParam);
  if (!day || Number.isNaN(day) || day < 1) {
    return res.status(400).json({ message: 'Invalid day parameter' });
  }

  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const card = await printCardService.deletePrintCard(id, day);
  const cards = await printCardService.getPrintCards(id, countdown.totalDays);
  return res.json({ card, cards });
}

export async function getVoucherCardsForCountdown(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const cards = await voucherCardService.getVoucherCards(id, countdown.totalDays);
  return res.json({ cards });
}

export async function saveVoucherCard(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, day: dayParam } = req.params;
  const day = Number(dayParam);
  if (!day || Number.isNaN(day) || day < 1) {
    return res.status(400).json({ message: 'Invalid day parameter' });
  }

  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }
  if (day > (countdown.totalDays || 24)) {
    return res.status(400).json({ message: 'Day exceeds total days' });
  }

  const card = await voucherCardService.saveVoucherCard(id, day, req.body || {});
  const cards = await voucherCardService.getVoucherCards(id, countdown.totalDays);
  return res.json({ card, cards });
}

export async function deleteVoucherCard(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, day: dayParam } = req.params;
  const day = Number(dayParam);
  if (!day || Number.isNaN(day) || day < 1) {
    return res.status(400).json({ message: 'Invalid day parameter' });
  }

  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const card = await voucherCardService.deleteVoucherCard(id, day);
  const cards = await voucherCardService.getVoucherCards(id, countdown.totalDays);
  return res.json({ card, cards });
}

// 獲取兌換紀錄
export async function getVoucherRedemptions(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !Users) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const redemptions = await voucherRedemptionService.getRedemptionsByCountdown(id);

  // 獲取接收者資訊
  const receiverIds = [...new Set(redemptions.map((r) => r.receiverId))];
  const receivers = await Users.find({ id: { $in: receiverIds } }).toArray();
  const receiverMap = new Map(receivers.map((r) => [r.id, { id: r.id, name: r.name, email: r.email, avatar: r.avatar }]));

  const redemptionsWithUser = redemptions.map((r) => ({
    ...r,
    receiver: receiverMap.get(r.receiverId) || null,
  }));

  const pendingCount = redemptions.filter((r) => r.status === 'pending').length;

  return res.json({
    redemptions: redemptionsWithUser,
    pendingCount,
  });
}

// 確認兌換
export async function confirmVoucherRedemption(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, redemptionId } = req.params;
  const { note } = req.body || {};

  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // 確認兌換請求屬於這個倒數專案
  const redemption = await voucherRedemptionService.getRedemptionById(redemptionId);
  if (!redemption || redemption.countdownId !== id) {
    return res.status(404).json({ message: 'Redemption not found' });
  }

  const updated = await voucherRedemptionService.confirmRedemption(redemptionId, note);
  if (!updated) {
    return res.status(500).json({ message: 'Failed to confirm redemption' });
  }

  return res.json({
    success: true,
    message: 'Redemption confirmed',
    redemption: updated,
  });
}

// 拒絕兌換
export async function rejectVoucherRedemption(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, redemptionId } = req.params;
  const { note } = req.body || {};

  const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // 確認兌換請求屬於這個倒數專案
  const redemption = await voucherRedemptionService.getRedemptionById(redemptionId);
  if (!redemption || redemption.countdownId !== id) {
    return res.status(404).json({ message: 'Redemption not found' });
  }

  const updated = await voucherRedemptionService.rejectRedemption(redemptionId, note);
  if (!updated) {
    return res.status(500).json({ message: 'Failed to reject redemption' });
  }

  return res.json({
    success: true,
    message: 'Redemption rejected',
    redemption: updated,
  });
}

export async function getCountdownDay(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Countdowns || !CountdownDays) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, day } = req.params;
  const countdown = await Countdowns.findOne({ id });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // Check permissions (similar to getCountdownById)
  if (req.user.role === 'creator' && countdown.ownerId !== req.user.id) {
    return res.status(403).json({ message: 'Not allowed to view this countdown' });
  }
  // Receivers can also access this if needed, but primarily for editor optimization now
  if (req.user.role === 'receiver') {
    const assignment = await Assignments?.findOne({ countdownId: id, receiverId: req.user.id });
    if (!assignment) {
      return res.status(403).json({ message: 'Countdown not shared with this receiver' });
    }
  }

  const dayNum = Number(day);
  if (!Number.isFinite(dayNum)) {
    return res.status(400).json({ message: 'Invalid day' });
  }

  const dayCard = await CountdownDays.findOne({ countdownId: id, day: dayNum });
  if (!dayCard) {
    // If no specific card exists, return a default structure or 404
    // For editor, we might want to return a default empty card structure if it doesn't exist yet
    // But usually persistDayCards ensures they exist.
    return res.status(404).json({ message: 'Day content not found' });
  }

  return res.json({ dayCard });
}
