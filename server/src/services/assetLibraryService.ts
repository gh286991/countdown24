import { Assets } from '../db/connection.js';
import { generateId } from '../utils/helpers.js';
import type { UserAsset } from '../types/index.js';

interface CreateAssetPayload {
  userId: string;
  key: string;
  url: string;
  etag: string;
  fileName?: string;
  contentType?: string;
  folder?: string;
  size?: number;
}

interface ListOptions {
  userId: string;
  limit?: number;
  cursor?: string | null;
  search?: string;
}

export async function findAssetByEtag(userId: string, etag: string): Promise<UserAsset | null> {
  if (!Assets) throw new Error('Database not initialized');
  const asset = await Assets.findOne({ userId, etag });
  return asset as UserAsset | null;
}

export async function createAssetRecord(payload: CreateAssetPayload): Promise<UserAsset> {
  if (!Assets) throw new Error('Database not initialized');
  const now = new Date();
  const asset: UserAsset = {
    id: generateId('asset'),
    userId: payload.userId,
    key: payload.key,
    url: payload.url,
    etag: payload.etag,
    fileName: payload.fileName || null,
    contentType: payload.contentType || null,
    folder: payload.folder || null,
    size: typeof payload.size === 'number' ? payload.size : null,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    usageCount: 1,
  };
  await Assets.insertOne(asset);
  return asset;
}

export async function markAssetUsed(assetId: string): Promise<void> {
  if (!Assets) throw new Error('Database not initialized');
  const now = new Date();
  await Assets.updateOne(
    { id: assetId },
    {
      $set: { updatedAt: now, lastUsedAt: now },
      $inc: { usageCount: 1 },
    },
  );
}

export async function listAssetsForUser(options: ListOptions): Promise<{ items: UserAsset[]; nextCursor: string | null }> {
  if (!Assets) throw new Error('Database not initialized');
  const { userId, search } = options;
  const limit = Math.max(1, Math.min(options.limit || 30, 100));
  const query: any = { userId };

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ fileName: regex }, { folder: regex }];
  }

  if (options.cursor) {
    const cursorDate = new Date(options.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      query.createdAt = { $lt: cursorDate };
    }
  }

  const docs = (await Assets.find(query).sort({ createdAt: -1 }).limit(limit + 1).toArray()) as unknown as UserAsset[];
  const hasNext = docs.length > limit;
  const sliced = hasNext ? docs.slice(0, limit) : docs;
  const nextCursor = hasNext ? normalizeCursor(sliced[sliced.length - 1]) : null;

  return {
    items: sliced as UserAsset[],
    nextCursor,
  };
}

function normalizeCursor(asset?: UserAsset): string | null {
  if (!asset) return null;
  if (asset.createdAt instanceof Date) {
    return asset.createdAt.toISOString();
  }
  if (typeof asset.createdAt === 'string') {
    const parsed = new Date(asset.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}
