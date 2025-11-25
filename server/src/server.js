import compression from 'compression';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const DEFAULT_TOTAL_DAYS = 24;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'countdown24';

let client;
let database;
let Users;
let Countdowns;
let Assignments;
let Tokens;
let CountdownDays;

function sanitizeUser(user) {
  if (!user) return null;
  const { password, _id, ...rest } = user;
  return rest;
}

function hashPassword(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

async function issueToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  await Tokens.insertOne({ token, userId, expiresAt });
  return { token, expiresAt };
}

async function purgeExpiredTokens() {
  const now = Date.now();
  await Tokens.deleteMany({ expiresAt: { $lte: now } });
}

function addDays(date, days) {
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) return null;
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

function normalizeDate(value, fallback) {
  if (!value) return fallback ? new Date(fallback).toISOString() : null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback ? new Date(fallback).toISOString() : null;
  }
  return parsed.toISOString();
}

function normalizeTotalDays(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_TOTAL_DAYS;
  return Math.min(90, Math.round(parsed));
}

function hasRewardData(reward) {
  if (!reward) return false;
  return Boolean(reward.title || reward.message || reward.imageUrl || reward.qrCode);
}

function buildDayCards(totalDays = DEFAULT_TOTAL_DAYS, cards = [], countdown = null) {
  const map = new Map((cards || []).filter(Boolean).map((card) => [card.day, card]));
  const rewardMap = new Map((countdown?.qrRewards || []).map((reward) => [reward.day, reward]));
  return Array.from({ length: totalDays }).map((_, index) => {
    const day = index + 1;
    const base = map.get(day) || {};
    const type = base.type === 'qr' ? 'qr' : 'story';
    let qrReward = null;
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
    return {
      id: base.id || null,
      day,
      title: base.title || '',
      description: base.description || '',
      coverImage: base.coverImage || '',
      type,
      cgScript: type === 'story' ? base.cgScript || null : null,
      qrReward,
    };
  });
}

async function persistDayCards(countdownId, totalDays = DEFAULT_TOTAL_DAYS, cards = [], countdown = null) {
  if (!countdownId) return [];
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
          cgScript: card.type === 'story' ? card.cgScript || null : null,
          qrReward: card.type === 'qr' ? card.qrReward || null : null,
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

async function attachDayCards(countdown) {
  if (!countdown) return null;
  const cards = await CountdownDays.find({ countdownId: countdown.id }).toArray();
  return { ...countdown, dayCards: buildDayCards(countdown.totalDays || DEFAULT_TOTAL_DAYS, cards, countdown) };
}

async function attachDayCardsToMany(countdowns = []) {
  if (!countdowns.length) return [];
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

function computeAvailableDay(countdown) {
  if (!countdown.startDate) return countdown.totalDays || DEFAULT_TOTAL_DAYS;
  const start = new Date(countdown.startDate).getTime();
  if (Number.isNaN(start)) return countdown.totalDays || DEFAULT_TOTAL_DAYS;
  const now = Date.now();
  if (now < start) return 0;
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(countdown.totalDays || DEFAULT_TOTAL_DAYS, diff);
}

function isEntryUnlocked(entry, availableDay) {
  if (entry.availableOn) {
    const release = new Date(entry.availableOn).getTime();
    return !Number.isNaN(release) && release <= Date.now();
  }
  return (entry.day || 0) <= availableDay;
}

function withAvailableContent(countdown) {
  const snapshot = JSON.parse(JSON.stringify(countdown));
  const availableDay = computeAvailableDay(countdown);
  snapshot.availableDay = availableDay;
  snapshot.storyMoments = countdown.storyMoments || [];
  snapshot.qrRewards = countdown.qrRewards || [];
  snapshot.cgScript = countdown.cgScript || null;
  snapshot.dayCards = buildDayCards(countdown.totalDays || DEFAULT_TOTAL_DAYS, countdown.dayCards, countdown);
  snapshot.dayCards = snapshot.dayCards.map((card) => ({
    ...card,
    unlocked: card.day <= availableDay,
  }));
  return snapshot;
}

function countdownSummary(countdown) {
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

async function ensureRecipientAssignments(countdownId, recipientIds = []) {
  if (!recipientIds.length) return;
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
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

async function resolveReceiverIds(recipientIds = [], recipientEmails = []) {
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

async function requireAuth(req, res, next) {
  try {
    await purgeExpiredTokens();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    const stored = await Tokens.findOne({ token });
    if (!stored) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await Users.findOne({ id: stored.userId });
    if (!user) {
      return res.status(401).json({ message: 'User not found for token' });
    }

    req.user = sanitizeUser(user);
    req.token = token;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(role) {
  return function roleGuard(req, res, next) {
    if (!req.user || (role && req.user.role !== role)) {
      return res.status(403).json({ message: 'Insufficient permissions for this action' });
    }
    return next();
  };
}

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

app.use(
  cors({
    origin: [CLIENT_ORIGIN],
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(compression());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const lowerEmail = email.toLowerCase();
    const normalizedRole = role === 'receiver' ? 'receiver' : 'creator';
    const existing = await Users.findOne({ email: lowerEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const newUser = {
      id: generateId('usr'),
      name,
      email: lowerEmail,
      password: hashPassword(password),
      role: normalizedRole,
      avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
      bio: normalizedRole === 'creator'
        ? 'Designs countdown experiences'
        : 'Unlocks QR gifts',
    };

    await Users.insertOne(newUser);
    const session = await issueToken(newUser.id);
    return res.status(201).json({ token: session.token, expiresAt: session.expiresAt, user: sanitizeUser(newUser) });
  }),
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const lowerEmail = email.toLowerCase();
    const hashed = hashPassword(password);
    const user = await Users.findOne({ email: lowerEmail, password: hashed });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const session = await issueToken(user.id);
    return res.json({ token: session.token, expiresAt: session.expiresAt, user: sanitizeUser(user) });
  }),
);

app.get(
  '/api/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const response = { user: req.user };
    if (req.user.role === 'creator') {
      const owned = await Countdowns.find({ ownerId: req.user.id }).toArray();
      const hydrated = await attachDayCardsToMany(owned);
      response.countdowns = hydrated.map(countdownSummary);
    } else {
      const assignments = await Assignments.find({ receiverId: req.user.id }).toArray();
      const countdownIds = assignments.map((assignment) => assignment.countdownId);
      const countdownDocs = await Countdowns.find({ id: { $in: countdownIds } }).toArray();
      const hydrated = await attachDayCardsToMany(countdownDocs);
      const map = new Map(hydrated.map((doc) => [doc.id, doc]));
      response.assignments = assignments.map((assignment) => ({
        id: assignment.id,
        status: assignment.status,
        unlockedOn: assignment.unlockedOn,
        countdown: map.has(assignment.countdownId) ? countdownSummary(map.get(assignment.countdownId)) : null,
      }));
    }

    return res.json(response);
  }),
);

app.get(
  '/api/countdowns',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'creator') {
      const owned = await Countdowns.find({ ownerId: req.user.id }).toArray();
      const hydrated = await attachDayCardsToMany(owned);
      return res.json({ items: hydrated.map(countdownSummary) });
    }

    const assignments = await Assignments.find({ receiverId: req.user.id }).toArray();
    const countdownIds = assignments.map((assignment) => assignment.countdownId);
    const countdownDocs = await Countdowns.find({ id: { $in: countdownIds } }).toArray();
    const hydrated = await attachDayCardsToMany(countdownDocs);
    const map = new Map(hydrated.map((doc) => [doc.id, doc]));
    const items = assignments
      .map((assignment) => {
        const countdown = map.get(assignment.countdownId);
        if (!countdown) return null;
        return {
          assignmentId: assignment.id,
          status: assignment.status,
          unlockedOn: assignment.unlockedOn,
          countdown: countdownSummary(countdown),
        };
      })
      .filter(Boolean);

    return res.json({ items });
  }),
);

app.post(
  '/api/countdowns',
  requireAuth,
  requireRole('creator'),
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    if (!payload.title) {
      return res.status(400).json({ message: 'Countdown title is required' });
    }

    const recipientIds = await resolveReceiverIds(payload.recipientIds, payload.recipientEmails);
    const normalizedStartDate = normalizeDate(payload.startDate, new Date().toISOString());
    const totalDays = normalizeTotalDays(payload.totalDays);
    const normalizedEndDate = addDays(normalizedStartDate, totalDays - 1)?.toISOString() || normalizedStartDate;

    const newCountdown = {
      id: generateId('cd'),
      ownerId: req.user.id,
      title: payload.title,
      type: payload.type || 'story',
      description: payload.description || '',
      coverImage: payload.coverImage || 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70',
      theme: payload.theme || { primary: '#f472b6', secondary: '#22d3ee' },
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      totalDays,
      storyMoments: (payload.storyMoments || [])
        .map((moment) => ({
          ...moment,
          availableOn: normalizeDate(moment.availableOn, addDays(normalizedStartDate, (moment.day || 1) - 1)),
        }))
        .filter((moment) => moment.day >= 1 && moment.day <= totalDays),
      qrRewards: (payload.qrRewards || [])
        .map((reward) => ({
          ...reward,
          availableOn: normalizeDate(reward.availableOn, addDays(normalizedStartDate, (reward.day || 1) - 1)),
        }))
        .filter((reward) => reward.day >= 1 && reward.day <= totalDays),
      cgScript: payload.cgScript || null,
      recipientIds,
    };

    await Countdowns.insertOne(newCountdown);
    await persistDayCards(newCountdown.id, totalDays, payload.dayCards || [], newCountdown);
    await ensureRecipientAssignments(newCountdown.id, newCountdown.recipientIds);
    const hydrated = await attachDayCards(newCountdown);
    return res.status(201).json({ countdown: countdownSummary(hydrated) });
  }),
);

app.put(
  '/api/countdowns/:id',
  requireAuth,
  requireRole('creator'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
    if (!countdown) {
      return res.status(404).json({ message: 'Countdown not found' });
    }
    const countdownWithCards = await attachDayCards(countdown);

    const updates = req.body || {};
    const updatedRecipients = await resolveReceiverIds(updates.recipientIds || countdown.recipientIds, updates.recipientEmails);
    const nextStartDate = updates.startDate ? normalizeDate(updates.startDate, countdown.startDate) : countdown.startDate;
    const nextTotalDays = updates.totalDays ? normalizeTotalDays(updates.totalDays) : countdown.totalDays;
    const nextEndDate = updates.endDate
      ? normalizeDate(updates.endDate, countdown.endDate)
      : addDays(nextStartDate, nextTotalDays - 1)?.toISOString() || countdown.endDate;

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
        .map((moment) => ({
          ...moment,
          availableOn: normalizeDate(moment.availableOn, addDays(nextStartDate, (moment.day || 1) - 1)),
        }))
        .filter((moment) => moment.day >= 1 && moment.day <= nextTotalDays),
      qrRewards: (updates.qrRewards || countdown.qrRewards || [])
        .map((reward) => ({
          ...reward,
          availableOn: normalizeDate(reward.availableOn, addDays(nextStartDate, (reward.day || 1) - 1)),
        }))
        .filter((reward) => reward.day >= 1 && reward.day <= nextTotalDays),
      cgScript: updates.cgScript ?? countdown.cgScript ?? null,
      recipientIds: updatedRecipients,
    };

    const record = { ...nextCountdown };
    delete record.dayCards;

    await Countdowns.updateOne({ id }, { $set: record });
    const nextDayCards = await persistDayCards(
      id,
      nextTotalDays,
      updates.dayCards || countdownWithCards.dayCards || [],
      nextCountdown,
    );
    await ensureRecipientAssignments(id, updatedRecipients);

    const responseCountdown = { ...nextCountdown, dayCards: nextDayCards };
    return res.json({ countdown: withAvailableContent(responseCountdown) });
  }),
);

app.delete(
  '/api/countdowns/:id',
  requireAuth,
  requireRole('creator'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
    if (!countdown) {
      return res.status(404).json({ message: 'Countdown not found' });
    }

    await Countdowns.deleteOne({ id });
    await Assignments.deleteMany({ countdownId: id });
    await CountdownDays.deleteMany({ countdownId: id });

    return res.json({ id });
  }),
);

app.post(
  '/api/countdowns/:id/assign',
  requireAuth,
  requireRole('creator'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const countdown = await Countdowns.findOne({ id, ownerId: req.user.id });
    if (!countdown) {
      return res.status(404).json({ message: 'Countdown not found' });
    }
    const countdownWithCards = await attachDayCards(countdown);

    const { receiverIds = [], receiverEmails = [] } = req.body || {};
    const validReceivers = await resolveReceiverIds(receiverIds, receiverEmails);
    if (!validReceivers.length) {
      return res.status(400).json({ message: 'No valid receivers found' });
    }

    const mergedRecipients = Array.from(new Set([...(countdown.recipientIds || []), ...validReceivers]));
    await Countdowns.updateOne({ id }, { $set: { recipientIds: mergedRecipients } });
    await ensureRecipientAssignments(countdown.id, validReceivers);
    const assigned = await Assignments.find({ countdownId: countdown.id }).toArray();

    return res.json({ countdown: countdownSummary({ ...countdownWithCards, recipientIds: mergedRecipients }), assignments: assigned });
  }),
);

app.get(
  '/api/countdowns/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const countdown = await Countdowns.findOne({ id });
    if (!countdown) {
      return res.status(404).json({ message: 'Countdown not found' });
    }
    const countdownWithCards = await attachDayCards(countdown);

    if (req.user.role === 'creator' && countdown.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed to view this countdown' });
    }

    if (req.user.role === 'receiver') {
      const assignment = await Assignments.findOne({ countdownId: id, receiverId: req.user.id });
      if (!assignment) {
        return res.status(403).json({ message: 'Countdown not shared with this receiver' });
      }
    }

    const payload = { countdown: withAvailableContent(countdownWithCards) };
    if (req.user.role === 'creator' && countdown.ownerId === req.user.id) {
      payload.assignments = await Assignments.find({ countdownId: countdown.id }).toArray();
    }
    return res.json(payload);
  }),
);

app.get(
  '/api/receiver/inbox',
  requireAuth,
  requireRole('receiver'),
  asyncHandler(async (req, res) => {
    const assignments = await Assignments.find({ receiverId: req.user.id }).toArray();
    const countdownIds = assignments.map((assignment) => assignment.countdownId);
    const countdownDocs = await Countdowns.find({ id: { $in: countdownIds } }).toArray();
    const hydrated = await attachDayCardsToMany(countdownDocs);
    const map = new Map(hydrated.map((doc) => [doc.id, doc]));
    const items = assignments.map((assignment) => ({
      id: assignment.id,
      status: assignment.status,
      unlockedOn: assignment.unlockedOn,
      countdown: map.has(assignment.countdownId) ? countdownSummary(map.get(assignment.countdownId)) : null,
    }));

    return res.json({ items });
  }),
);

app.get(
  '/api/receiver/countdowns/:id',
  requireAuth,
  requireRole('receiver'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const assignment = await Assignments.findOne({ id, receiverId: req.user.id });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const countdown = await Countdowns.findOne({ id: assignment.countdownId });
    if (!countdown) {
      return res.status(404).json({ message: 'Countdown not found' });
    }

    const countdownWithCards = await attachDayCards(countdown);
    return res.json({ assignment, countdown: withAvailableContent(countdownWithCards) });
  }),
);

app.get(
  '/api/receiver/countdowns/:id/days/:day',
  requireAuth,
  requireRole('receiver'),
  asyncHandler(async (req, res) => {
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

    const countdownWithCards = await attachDayCards(countdown);
    const totalDays = countdownWithCards.totalDays || DEFAULT_TOTAL_DAYS;
    if (requestedDay < 1 || requestedDay > totalDays) {
      return res.status(400).json({ message: 'Day out of range' });
    }

    const dayCard = (countdownWithCards.dayCards || []).find((card) => card.day === requestedDay);
    if (!dayCard) {
      return res.status(404).json({ message: 'Content not found for this day' });
    }

    const availableDay = computeAvailableDay(countdownWithCards);
    if (requestedDay > availableDay) {
      return res.status(403).json({ message: 'Day not unlocked yet' });
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
    });
  }),
);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('API Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

async function seedDemoData() {
  const existingUsers = await Users.countDocuments();
  if (existingUsers > 0) return;

  const sampleUsers = [
    {
      id: 'usr-creator-demo',
      name: 'Aurora',
      email: 'creator@example.com',
      password: hashPassword('creatorPass!123'),
      role: 'creator',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9',
      bio: 'Designs cinematic CG countdowns',
    },
    {
      id: 'usr-receiver-demo',
      name: 'Noel',
      email: 'receiver@example.com',
      password: hashPassword('receiverPass!123'),
      role: 'receiver',
      avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39',
      bio: 'Collects QR gifts and story scenes',
    },
  ];

  const sampleCountdowns = [
    {
      id: 'cd-story-demo',
      ownerId: 'usr-creator-demo',
      title: 'Chronicles of Us',
      type: 'story',
      description: '24 pieces of art direction and dialogue leading up to day zero.',
      coverImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      theme: { primary: '#f472b6', secondary: '#22d3ee' },
      startDate: '2024-12-01T00:00:00.000Z',
      endDate: '2024-12-24T00:00:00.000Z',
      totalDays: 24,
      cgScript: {
        cover: {
          title: 'DAY 1 / 24',
          subtitle: '2323 · 2323',
          description: '一進來會先看到封面，按下開始才會播放 CG 對話。',
          image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f',
          cta: '開始播放',
        },
        startScene: 'arrival',
        scenes: [
          {
            id: 'arrival',
            label: 'DAY 1 · 屋頂',
            background: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
            dialogue: [
              { speaker: '???', text: '額…你是？這裡只有受邀的人。' },
              { speaker: '你', text: '我按照 CG 信件來報到的。' },
              { speaker: '???', text: '那先回答我吧。' },
            ],
            choices: [
              { label: '額…你是？', next: 'curious' },
              { label: '你真的很可愛！', next: 'flirt' },
            ],
          },
          {
            id: 'curious',
            label: 'DAY 1 · 自我介紹',
            background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
            dialogue: [
              { speaker: '晴', text: '哈哈，我是晴，之後 24 天由我帶你。' },
              { speaker: '你', text: '原來 CG 是你寫的。' },
            ],
            next: 'stargaze',
          },
          {
            id: 'flirt',
            label: 'DAY 1 · 調皮選項',
            background: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df',
            dialogue: [
              { speaker: '晴', text: '突然這樣講會讓人害羞耶。' },
              { speaker: '你', text: '只是說出真心話。' },
            ],
            next: 'stargaze',
          },
      {
        id: 'stargaze',
        label: 'DAY 1 · 夜空',
        background: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c',
        dialogue: [
          { speaker: '旁白', text: '星光軌跡在夜幕延伸。' },
          { speaker: '晴', text: '準備好迎接下一天了嗎？' },
        ],
      },
    ],
    ending: {
      title: 'DAY 1 CLEAR',
      message: '完成第一天的 CG，等待下一次播放。',
      image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
      cta: '回到封面',
    },
  },
      storyMoments: [
        {
          day: 1,
          imageUrl: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70',
          speaker: 'Aurora',
          lineOne: 'Day 1: The signal flickers on.',
          lineTwo: 'You found the first shard.',
          availableOn: '2024-12-01T00:00:00.000Z',
        },
        {
          day: 8,
          imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
          speaker: 'Aurora',
          lineOne: 'Day 8: The neon garden blooms.',
          lineTwo: 'Unfold the next line of poetry.',
          availableOn: '2024-12-08T00:00:00.000Z',
        },
        {
          day: 24,
          imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
          speaker: 'Aurora',
          lineOne: 'Finale: Doors open to the festival.',
          lineTwo: 'Meet me where the aurora falls.',
          availableOn: '2024-12-24T00:00:00.000Z',
        },
      ],
      qrRewards: [],
      recipientIds: ['usr-receiver-demo'],
    },
    {
      id: 'cd-qr-demo',
      ownerId: 'usr-creator-demo',
      title: 'QR Gift Vault',
      type: 'qr',
      description: 'Scanable goodies and vouchers for each phase.',
      coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
      theme: { primary: '#22d3ee', secondary: '#fbbf24' },
      startDate: '2024-12-10T00:00:00.000Z',
      endDate: '2025-01-02T00:00:00.000Z',
      totalDays: 24,
      storyMoments: [],
      qrRewards: [
        {
          day: 5,
          title: 'Latte on me',
          message: 'Scan to redeem a cozy drink',
          imageUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096',
          qrCode: 'coffee-latte-2024',
          availableOn: '2024-12-14T00:00:00.000Z',
        },
        {
          day: 14,
          title: 'Arcade night',
          message: 'Tokens hidden at the neon arcade',
          imageUrl: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d',
          qrCode: 'arcade-pass-14',
          availableOn: '2024-12-23T00:00:00.000Z',
        },
      ],
      cgScript: null,
      recipientIds: ['usr-receiver-demo'],
    },
  ];

  const sampleDayCards = {
    'cd-story-demo': [
      {
        day: 1,
        title: 'DAY 1 · 屋頂',
        description: '第一天的 CG 序章。',
        coverImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
        type: 'story',
        cgScript: sampleCountdowns.find((item) => item.id === 'cd-story-demo')?.cgScript || null,
      },
    ],
    'cd-qr-demo': [
      {
        day: 5,
        title: 'Latte on me',
        description: '咖啡交換券解鎖日。',
        coverImage: 'https://images.unsplash.com/photo-1498804103079-a6351b050096',
        type: 'qr',
        qrReward: sampleCountdowns
          .find((item) => item.id === 'cd-qr-demo')
          ?.qrRewards?.find((reward) => reward.day === 5) || null,
      },
      {
        day: 14,
        title: 'Arcade night',
        description: '街機夜晚小卡',
        coverImage: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d',
        type: 'qr',
        qrReward: sampleCountdowns
          .find((item) => item.id === 'cd-qr-demo')
          ?.qrRewards?.find((reward) => reward.day === 14) || null,
      },
    ],
  };

  const sampleAssignments = [
    {
      id: 'asn-demo-story',
      countdownId: 'cd-story-demo',
      receiverId: 'usr-receiver-demo',
      status: 'unlocked',
      unlockedOn: '2024-12-01T00:00:00.000Z',
    },
    {
      id: 'asn-demo-qr',
      countdownId: 'cd-qr-demo',
      receiverId: 'usr-receiver-demo',
      status: 'locked',
      unlockedOn: null,
    },
  ];

  await Users.insertMany(sampleUsers);
  await Countdowns.insertMany(sampleCountdowns);
  await Assignments.insertMany(sampleAssignments);
  await Promise.all(
    sampleCountdowns.map((countdown) =>
      persistDayCards(countdown.id, countdown.totalDays, sampleDayCards[countdown.id] || [], countdown)),
  );
}

async function connectDatabase() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  database = client.db(DB_NAME);
  Users = database.collection('users');
  Countdowns = database.collection('countdowns');
  Assignments = database.collection('assignments');
  Tokens = database.collection('tokens');
  CountdownDays = database.collection('countdownDays');

  await Users.createIndex({ email: 1 }, { unique: true });
  await Users.createIndex({ id: 1 }, { unique: true });
  await Countdowns.createIndex({ id: 1 }, { unique: true });
  await Assignments.createIndex({ id: 1 }, { unique: true });
  await Assignments.createIndex({ countdownId: 1, receiverId: 1 }, { unique: true });
  await Tokens.createIndex({ token: 1 }, { unique: true });
  await CountdownDays.createIndex({ id: 1 }, { unique: true });
  await CountdownDays.createIndex({ countdownId: 1, day: 1 }, { unique: true });
}

async function bootstrap() {
  await connectDatabase();
  await seedDemoData();
  app.listen(PORT, () => {
    console.log(`Countdown24 API ready on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Unable to start API server', error);
  process.exit(1);
});
