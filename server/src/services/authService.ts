import crypto from 'crypto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { Tokens, Users } from '../db/connection.js';
import { hashPassword, sanitizeUser, generateId } from '../utils/helpers.js';
import type { User } from '../types/index.js';
import { GOOGLE_CLIENT_ID } from '../config/index.js';

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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
    authProvider: 'password' as const,
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

async function verifyGoogleCredential(idToken: string): Promise<TokenPayload> {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    throw new Error('Google login is not configured');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Unable to verify Google credential');
  }
  return payload;
}

export async function loginWithGoogle(
  idToken: string,
  role?: 'creator' | 'receiver',
): Promise<{ user: User; token: string; expiresAt: number }> {
  if (!Users) throw new Error('Users collection not initialized');
  const payload = await verifyGoogleCredential(idToken);
  if (!payload.email) {
    throw new Error('Google account is missing email address');
  }

  const lowerEmail = payload.email.toLowerCase();
  const normalizedRole = role === 'receiver' ? 'receiver' : 'creator';
  let user: any = await Users.findOne({ email: lowerEmail });

  if (!user) {
    const newUser = {
      id: generateId('usr'),
      name: payload.name || payload.given_name || 'Google 使用者',
      email: lowerEmail,
      password: '',
      role: normalizedRole,
      avatar: payload.picture || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(lowerEmail)}`,
      bio: normalizedRole === 'creator'
        ? 'Designs countdown experiences'
        : 'Unlocks QR gifts',
      googleId: payload.sub,
      authProvider: 'google' as const,
    };
    await Users.insertOne(newUser);
    user = newUser;
  } else {
    const updates: Record<string, any> = {};
    if (!user.googleId && payload.sub) updates.googleId = payload.sub;
    if (!user.authProvider) updates.authProvider = 'google';
    const canReplaceAvatar = !user.avatar || user.avatar.includes('dicebear.com');
    if (payload.picture && canReplaceAvatar && user.avatar !== payload.picture) {
      updates.avatar = payload.picture;
    }
    if (Object.keys(updates).length > 0) {
      await Users.updateOne({ id: user.id }, { $set: updates });
      user = { ...user, ...updates };
    }
  }

  if (!user) {
    throw new Error('Unable to create Google user');
  }

  const session = await issueToken(user.id as string);
  return {
    user: sanitizeUser(user) as User,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}
