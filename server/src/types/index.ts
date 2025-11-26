export interface User {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: 'creator' | 'receiver';
  avatar?: string;
  bio?: string;
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
  type: 'story' | 'qr';
  cgScript?: any;
  qrReward?: QrReward | null;
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
