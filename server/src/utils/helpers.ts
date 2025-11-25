import crypto from 'crypto';
import { DEFAULT_TOTAL_DAYS } from '../config/index';

export function hashPassword(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

export function addDays(date: string | Date, days: number): Date | null {
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) return null;
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

export function normalizeDate(value: string | undefined, fallback?: string): string | null {
  if (!value) return fallback ? new Date(fallback).toISOString() : null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback ? new Date(fallback).toISOString() : null;
  }
  return parsed.toISOString();
}

export function normalizeTotalDays(value: any): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_TOTAL_DAYS;
  return Math.min(90, Math.round(parsed));
}

export function hasRewardData(reward: any): boolean {
  if (!reward) return false;
  return Boolean(reward.title || reward.message || reward.imageUrl || reward.qrCode);
}

export function sanitizeUser(user: any): any {
  if (!user) return null;
  const { password, _id, ...rest } = user;
  return rest;
}

