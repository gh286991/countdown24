import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { Tokens, Users } from '../db/connection.js';
import { sanitizeUser } from '../utils/helpers.js';

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await purgeExpiredTokens();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ')
      ? header.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    if (!Tokens) {
      return res.status(500).json({ message: 'Database not initialized' });
    }

    const stored = await Tokens.findOne({ token });
    if (!stored) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (!Users) {
      return res.status(500).json({ message: 'Database not initialized' });
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

export function requireRole(role: 'creator' | 'receiver') {
  return function roleGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || (role && req.user.role !== role)) {
      return res.status(403).json({ message: 'Insufficient permissions for this action' });
    }
    return next();
  };
}

async function purgeExpiredTokens(): Promise<void> {
  if (!Tokens) return;
  const now = Date.now();
  await Tokens.deleteMany({ expiresAt: { $lte: now } });
}
