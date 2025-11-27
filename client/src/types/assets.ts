export interface UserAsset {
  id: string;
  key: string;
  url: string;
  etag: string;
  fileName?: string | null;
  folder?: string | null;
  contentType?: string | null;
  size?: number | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  usageCount?: number;
  key?: string;
  etag?: string;
}
