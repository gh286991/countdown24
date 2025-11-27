import crypto from 'crypto';
import { DEFAULT_TOTAL_DAYS, PASSWORD_SECRET, QR_TOKEN_SECRET } from '../config/index.js';

export function hashPassword(value: string): string {
  // 使用 PASSWORD_SECRET 作為 salt 來加密密碼
  return crypto.createHmac('sha256', PASSWORD_SECRET).update(value).digest('hex');
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
  const { password, _id, googleId, ...rest } = user;
  return rest;
}

/**
 * 生成每天唯一的 QR code token
 * 使用 countdownId + day + QR_TOKEN_SECRET 生成，確保每天都有唯一且不可預測的 token
 */
export function generateDayQrToken(countdownId: string, day: number): string {
  const input = `${countdownId}-${day}-${QR_TOKEN_SECRET}`;
  const hash = crypto.createHmac('sha256', QR_TOKEN_SECRET).update(input).digest('hex');
  // 取前 16 個字符作為 token，加上 day 前綴以便識別
  return `day${day}-${hash.substring(0, 16)}`;
}

/**
 * 驗證 QR code token 是否有效
 */
export function verifyDayQrToken(token: string, countdownId: string, day: number): boolean {
  const expected = generateDayQrToken(countdownId, day);
  return token === expected;
}
