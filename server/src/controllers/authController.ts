import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as authService from '../services/authService.js';
import { Countdowns, Assignments, Users } from '../db/connection.js';
import * as countdownService from '../services/countdownService.js';

export async function register(req: Request, res: Response) {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    const result = await authService.registerUser({ name, email, password, role });
    return res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'Email already registered') {
      return res.status(409).json({ message: error.message });
    }
    throw error;
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await authService.loginUser(email, password);
    return res.json(result);
  } catch (error: any) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ message: error.message });
    }
    throw error;
  }
}

export async function googleLogin(req: Request, res: Response) {
  const { credential, role } = req.body || {};
  if (!credential) {
    return res.status(400).json({ message: 'Missing Google credential' });
  }

  try {
    const result = await authService.loginWithGoogle(credential, role);
    return res.json(result);
  } catch (error: any) {
    if (error.message === 'Google login is not configured') {
      return res.status(503).json({ message: 'Google 登入尚未設定' });
    }
    if (
      error.message === 'Unable to verify Google credential' ||
      error.message === 'Google account is missing email address'
    ) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message || 'Google 登入失敗' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!Countdowns || !Assignments) {
    return res.status(500).json({ message: 'Database not initialized' });
  }

  const response: any = { user: req.user };
  
  if (req.user.role === 'creator') {
    const owned = await Countdowns.find({ ownerId: req.user.id }).toArray();
    const hydrated = await countdownService.attachDayCardsToMany(owned);
    response.countdowns = hydrated.map(countdownService.countdownSummary);
  } else {
    const assignments = await Assignments.find({ receiverId: req.user.id }).toArray();
    const countdownIds = assignments.map((assignment) => assignment.countdownId);
    const countdownDocs = await Countdowns.find({ id: { $in: countdownIds } }).toArray();
    const hydrated = await countdownService.attachDayCardsToMany(countdownDocs);
    const map = new Map(hydrated.map((doc) => [doc.id, doc]));
    response.assignments = assignments.map((assignment) => ({
      id: assignment.id,
      status: assignment.status,
      unlockedOn: assignment.unlockedOn,
      countdown: map.has(assignment.countdownId) ? countdownService.countdownSummary(map.get(assignment.countdownId)) : null,
    }));
  }

  return res.json(response);
}

export async function upgradeToCreator(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Users) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role === 'creator') {
    return res.status(400).json({ message: 'Already a creator' });
  }

  // 更新用戶角色
  await Users.updateOne(
    { id: req.user.id },
    { $set: { role: 'creator' } }
  );

  // 獲取更新後的用戶資料
  const updatedUser = await Users.findOne({ id: req.user.id });

  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ 
    message: 'Successfully upgraded to creator',
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
    }
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !Users) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { name, avatar, bio } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Name is required' });
  }

  // 更新用戶資料
  await Users.updateOne(
    { id: req.user.id },
    { $set: { name: name.trim(), avatar: avatar || '', bio: bio || '' } }
  );

  // 獲取更新後的用戶資料
  const updatedUser = await Users.findOne({ id: req.user.id });

  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ 
    message: 'Profile updated successfully',
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
    }
  });
}
