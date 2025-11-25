import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { Countdowns, Assignments, CountdownDays } from '../db/connection';
import * as countdownService from '../services/countdownService';
import { normalizeDate, normalizeTotalDays, addDays, generateId } from '../utils/helpers';

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

  const payload: any = { countdown: countdownService.withAvailableContent(countdownWithCards) };
  if (req.user.role === 'creator' && countdown.ownerId === req.user.id) {
    payload.assignments = await Assignments.find({ countdownId: countdown.id }).toArray();
  }
  return res.json(payload);
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
  const nextDayCards = await countdownService.persistDayCards(
    id,
    nextTotalDays,
    updates.dayCards || countdownWithCards.dayCards || [],
    nextCountdown,
  );
  await countdownService.ensureRecipientAssignments(id, updatedRecipients);

  const responseCountdown = { ...nextCountdown, dayCards: nextDayCards };
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

