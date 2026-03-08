export interface IUrlDocument {
  _id?: string;
  shortCode: string;
  longUrl: string;
  customAlias?: string;
  createdAt: Date;
  expiresAt?: Date;
  userId?: string;
  isActive: boolean;
  clickCount: number;
}

export interface ICreateUrlPayload {
  longUrl: string;
  shortCode: string,
  customAlias?: string;
  expiresAt?: Date;
  userId?: string;
}

export interface ICreateUrlResult {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
  createdAt: Date;
}

export interface IUrlCacheEntry {
  shortCode: string;
  longUrl: string;
  expiresAt?: number; // Unix timestamp ms — matches Date.now() comparisons
}
