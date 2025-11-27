export interface User {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: 'creator' | 'receiver';
  avatar?: string;
  bio?: string;
  googleId?: string;
  authProvider?: 'password' | 'google';
  _id?: any;
  [key: string]: any;
}

import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

export interface DayCard {
  id: string | null;
  day: number;
  title: string;
  description: string;
  coverImage: string;
  type: 'story' | 'qr' | 'voucher';
  cgScript?: any;
  qrReward?: QrReward | null;
  voucherDetail?: VoucherDetail | null;
  unlocked?: boolean;
}

export interface QrReward {
  title: string;
  message: string;
  imageUrl: string;
  qrCode: string;
  availableOn: string | null;
  day?: number;
}

export interface VoucherDetail {
  title: string;
  message: string;
  location?: string;
  terms?: string;
  validUntil?: string | null;
}

export interface Countdown {
  id: string;
  ownerId: string;
  title: string;
  type: 'story' | 'qr';
  description?: string;
  coverImage?: string;
  theme?: {
    primary: string;
    secondary: string;
  };
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  availableDay?: number;
  storyMoments?: any[];
  qrRewards?: QrReward[];
  cgScript?: any;
  recipientIds?: string[];
  dayCards?: DayCard[];
  [key: string]: any;
}

export interface Assignment {
  id: string;
  countdownId: string;
  receiverId: string;
  status: string;
  unlockedOn: string | null;
}

export type PrintCardTemplate = 'imageLeft' | 'imageRight' | 'stacked' | 'spotlight';

export interface PrintCard {
  id: string | null;
  countdownId: string;
  day: number;
  template: PrintCardTemplate;
  imageUrl: string;
  qrCode: string;
  title: string;
  subtitle: string;
  note: string;
  accentColor: string;
  isConfigured?: boolean;
  canvasJson?: any;
  previewImage?: string;
}

export interface VoucherCard {
  id: string | null;
  countdownId: string;
  day: number;
  template: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  note: string;
  accentColor: string;
  isConfigured?: boolean;
  canvasJson?: any;
  previewImage?: string;
}

export type VoucherRedemptionStatus = 'pending' | 'confirmed' | 'rejected';

export interface VoucherRedemption {
  id: string;
  countdownId: string;
  assignmentId: string;
  day: number;
  receiverId: string;
  status: VoucherRedemptionStatus;
  requestedAt: string;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  note?: string; // 接收者的備註
  creatorNote?: string; // 創作者的備註
}
