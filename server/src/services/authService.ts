import crypto from 'crypto';
import { Tokens, Users } from '../db/connection';
import { hashPassword, sanitizeUser, generateId } from '../utils/helpers';
import type { User } from '../types/index';

export async function issueToken(userId: string): Promise<{ token: string; expiresAt: number }> {
  if (!Tokens) throw new Error('Tokens collection not initialized');
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  await Tokens.insertOne({ token, userId, expiresAt });
  return { token, expiresAt };
}

export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
  role?: 'creator' | 'receiver';
}): Promise<{ user: User; token: string; expiresAt: number }> {
  if (!Users) throw new Error('Users collection not initialized');
  
  const lowerEmail = userData.email.toLowerCase();
  const normalizedRole = userData.role === 'receiver' ? 'receiver' : 'creator';
  
  const existing = await Users.findOne({ email: lowerEmail });
  if (existing) {
    throw new Error('Email already registered');
  }

  const newUser = {
    id: generateId('usr'),
    name: userData.name,
    email: lowerEmail,
    password: hashPassword(userData.password),
    role: normalizedRole,
    avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(userData.name)}`,
    bio: normalizedRole === 'creator'
      ? 'Designs countdown experiences'
      : 'Unlocks QR gifts',
  };

  await Users.insertOne(newUser);
  const session = await issueToken(newUser.id);
  
  return {
    user: sanitizeUser(newUser) as User,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string; expiresAt: number }> {
  if (!Users) throw new Error('Users collection not initialized');
  
  const lowerEmail = email.toLowerCase();
  const hashed = hashPassword(password);
  const user = await Users.findOne({ email: lowerEmail, password: hashed });
  
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const session = await issueToken(user.id);
  return {
    user: sanitizeUser(user) as User,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

