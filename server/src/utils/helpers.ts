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

export function hasVoucherData(voucher: any): boolean {
  if (!voucher) return false;
  return Boolean(voucher.title || voucher.message || voucher.location || voucher.terms || voucher.validUntil);
}

export function sanitizeUser(user: any): any {
  if (!user) return null;
  const { password, _id, ...rest } = user;
  return rest;
}

/**
 * 生成每天唯一的 QR code token
 * 使用 countdownId + day + secret 生成，確保每天都有唯一且不可預測的 token
 */
export function generateDayQrToken(countdownId: string, day: number, secret: string = 'countdown24-secret'): string {
  const input = `${countdownId}-${day}-${secret}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  // 取前 16 個字符作為 token，加上 day 前綴以便識別
  return `day${day}-${hash.substring(0, 16)}`;
}

/**
 * 驗證 QR code token 是否有效
 */
export function verifyDayQrToken(token: string, countdownId: string, day: number, secret: string = 'countdown24-secret'): boolean {
  const expected = generateDayQrToken(countdownId, day, secret);
  return token === expected;
}
