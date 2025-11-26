import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { Assignments, Countdowns, Users } from '../db/connection';
import * as countdownService from '../services/countdownService';
import * as voucherCardService from '../services/voucherCardService';
import * as voucherRedemptionService from '../services/voucherRedemptionService';
import { verifyDayQrToken } from '../utils/helpers';

export async function getInbox(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Assignments || !Countdowns || !Users) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const assignments = await Assignments.find({ receiverId: req.user.id }).toArray();
  const countdownIds = assignments.map((assignment) => assignment.countdownId);
  const countdownDocs = await Countdowns.find({ id: { $in: countdownIds } }).toArray();
  const hydrated = await countdownService.attachDayCardsToMany(countdownDocs);
  
  // 獲取所有創建者資訊
  const ownerIds = [...new Set(countdownDocs.map((doc) => doc.ownerId))];
  const owners = await Users.find({ id: { $in: ownerIds } }).toArray();
  const ownerMap = new Map(owners.map((owner) => [owner.id, {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    avatar: owner.avatar,
  }]));
  
  const map = new Map(hydrated.map((doc) => [doc.id, doc]));
  const items = assignments.map((assignment) => {
    const countdown = map.get(assignment.countdownId);
    return {
      id: assignment.id,
      status: assignment.status,
      unlockedOn: assignment.unlockedOn,
      countdown: countdown ? countdownService.countdownSummary(countdown) : null,
      creator: countdown ? ownerMap.get(countdown.ownerId) || null : null,
    };
  });

  return res.json({ items });
}

export async function getReceiverCountdown(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Assignments || !Countdowns || !Users) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const assignment = await Assignments.findOne({ id, receiverId: req.user.id });
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }

  const countdown = await Countdowns.findOne({ id: assignment.countdownId });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // 獲取創建者資訊
  const creator = await Users.findOne({ id: countdown.ownerId });
  const creatorInfo = creator ? {
    id: creator.id,
    name: creator.name,
    email: creator.email,
    avatar: creator.avatar,
  } : null;

  const countdownWithCards = await countdownService.attachDayCards(countdown);
  const voucherCards = await voucherCardService.getVoucherCards(countdown.id, countdown.totalDays);
  return res.json({ 
    assignment: {
      ...assignment,
      unlockedDays: assignment.unlockedDays || [],
    }, 
    countdown: countdownService.withAvailableContent({ ...countdownWithCards, voucherCards }),
    creator: creatorInfo,
  });
}

export async function getReceiverDayContent(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Assignments || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, day } = req.params;
  const assignment = await Assignments.findOne({ id, receiverId: req.user.id });
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }

  const countdown = await Countdowns.findOne({ id: assignment.countdownId });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  const requestedDay = Number(day);
  if (!Number.isFinite(requestedDay)) {
    return res.status(400).json({ message: 'Invalid day' });
  }

  const countdownWithCards = await countdownService.attachDayCards(countdown);
  const totalDays = countdownWithCards.totalDays || 24;
  if (requestedDay < 1 || requestedDay > totalDays) {
    return res.status(400).json({ message: 'Day out of range' });
  }

  const dayCard = (countdownWithCards.dayCards || []).find((card: any) => card.day === requestedDay);
  if (!dayCard) {
    return res.status(404).json({ message: 'Content not found for this day' });
  }

  const availableDay = countdownService.computeAvailableDay(countdown);
  if (requestedDay > availableDay) {
    return res.status(403).json({ message: 'Day not available yet.' });
  }

  // 檢查是否已通過 QR code 解鎖（所有類型都需要）
  const unlockedDays = assignment.unlockedDays || [];
  if (!unlockedDays.includes(requestedDay)) {
    return res.status(403).json({ message: 'Day not unlocked yet. Please scan the unlock code.' });
  }

  return res.json({
    assignmentId: assignment.id,
    countdownId: countdown.id,
    day: dayCard.day,
    title: dayCard.title,
    description: dayCard.description,
    type: dayCard.type,
    coverImage: dayCard.coverImage,
    cgScript: dayCard.type === 'story' ? dayCard.cgScript : null,
    qrReward: dayCard.type === 'qr' ? dayCard.qrReward : null,
    voucherDetail: dayCard.type === 'voucher' ? dayCard.voucherDetail : null,
  });
}

export async function unlockDayWithQr(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Assignments || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { assignmentId, qrToken } = req.body;
  if (!assignmentId || !qrToken) {
    return res.status(400).json({ message: 'Missing assignmentId or qrToken' });
  }

  const assignment = await Assignments.findOne({ id: assignmentId, receiverId: req.user.id });
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }

  const countdown = await Countdowns.findOne({ id: assignment.countdownId });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // 解析 token 中的 day 數字
  const dayMatch = qrToken.match(/^day(\d+)-/);
  if (!dayMatch) {
    return res.status(400).json({ message: 'Invalid QR token format' });
  }

  const day = Number(dayMatch[1]);
  if (!Number.isFinite(day) || day < 1) {
    return res.status(400).json({ message: 'Invalid day in token' });
  }

  // 驗證 token
  if (!verifyDayQrToken(qrToken, countdown.id, day)) {
    return res.status(403).json({ message: 'Invalid QR token' });
  }

  // 檢查該天是否已解鎖
  const unlockedDays = assignment.unlockedDays || [];
  
  if (unlockedDays.includes(day)) {
    return res.json({ 
      success: true, 
      message: 'Day already unlocked',
      unlockedDays: unlockedDays,
    });
  }

  // 解鎖該天
  const newUnlockedDays = [...unlockedDays, day].sort((a, b) => a - b);
  await Assignments.updateOne(
    { id: assignmentId },
    { $set: { unlockedDays: newUnlockedDays } }
  );

  return res.json({ 
    success: true, 
    message: 'Day unlocked successfully',
    unlockedDays: newUnlockedDays,
  });
}

// 請求兌換兌換卷
export async function requestVoucherRedemption(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Assignments || !Countdowns) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { assignmentId, day } = req.params;
  const { note } = req.body || {};
  const dayNum = Number(day);

  if (!Number.isFinite(dayNum) || dayNum < 1) {
    return res.status(400).json({ message: 'Invalid day parameter' });
  }

  const assignment = await Assignments.findOne({ id: assignmentId, receiverId: req.user.id });
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }

  const countdown = await Countdowns.findOne({ id: assignment.countdownId });
  if (!countdown) {
    return res.status(404).json({ message: 'Countdown not found' });
  }

  // 檢查該天是否是兌換卷類型
  const countdownWithCards = await countdownService.attachDayCards(countdown);
  const dayCard = (countdownWithCards.dayCards || []).find((card: any) => card.day === dayNum);
  if (!dayCard || dayCard.type !== 'voucher') {
    return res.status(400).json({ message: 'This day is not a voucher type' });
  }

  // 檢查該天是否已解鎖（可用）
  const availableDay = countdownService.computeAvailableDay(countdown);
  if (dayNum > availableDay) {
    return res.status(403).json({ message: 'Day not available yet' });
  }

  try {
    const redemption = await voucherRedemptionService.requestRedemption(
      countdown.id,
      assignmentId,
      dayNum,
      req.user.id!,
      note
    );

    return res.json({
      success: true,
      message: redemption.status === 'pending' ? 'Redemption requested' : 'Redemption already exists',
      redemption,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to request redemption' });
  }
}

// 獲取接收者的兌換紀錄
export async function getReceiverRedemptions(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Assignments) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { assignmentId } = req.params;
  const assignment = await Assignments.findOne({ id: assignmentId, receiverId: req.user.id });
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }

  const redemptions = await voucherRedemptionService.getRedemptionsByAssignment(assignmentId);
  return res.json({ redemptions });
}
