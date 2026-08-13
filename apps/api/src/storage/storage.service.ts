import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, extname, normalize, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface PutObjectInput {
  key: string;
  buffer: Buffer;
  contentType: string;
  tenantId: string;
}

export interface PutObjectResult {
  key: string;
  url: string;
}

export interface StorageDriver {
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl(key: string, expiresSec?: number): Promise<string>;
}

export const ALLOWED_UPLOAD_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/** Fayl nomidan path traversal va xavfli belgilarni olib tashlaydi. */
export function sanitizeFilename(raw: string): string {
  const base = raw.replace(/\\/g, '/').split('/').pop() ?? '';
  const cleaned = base
    .normalize('NFKC')
    .replace(/[^\w.\-()+ ]+/g, '_')
    .replace(/^\.+/, '')
    .trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new BadRequestException("Fayl nomi noto'g'ri");
  }
  return cleaned.slice(0, 180);
}

@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly uploadDir: string;
  private readonly maxBytes: number;
  private readonly apiPrefix: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = resolve(this.config.getOrThrow<string>('uploads.dir'));
    this.maxBytes = this.config.getOrThrow<number>('uploads.maxMb') * 1024 * 1024;
    this.apiPrefix = this.config.getOrThrow<string>('apiPrefix');
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    this.assertContentType(input.contentType);
    this.assertSize(input.buffer.length);

    const safeName = sanitizeFilename(input.key);
    const relativeKey = `${input.tenantId}/${safeName}`;
    const absolute = this.resolveSafePath(relativeKey);

    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, input.buffer);

    return { key: relativeKey, url: await this.getSignedUrl(relativeKey) };
  }

  async deleteObject(key: string): Promise<void> {
    const absolute = this.resolveSafePath(key);
    if (existsSync(absolute)) unlinkSync(absolute);
  }

  async getSignedUrl(key: string, _expiresSec?: number): Promise<string> {
    const normalized = key.replace(/^\/+/, '');
    return `/${this.apiPrefix}/files/${normalized}`;
  }

  /** Mahalliy fayl streami — faqat upload katalogi ichida. */
  openReadStream(key: string): { stream: ReturnType<typeof createReadStream>; absolutePath: string } {
    const absolute = this.resolveSafePath(key);
    if (!existsSync(absolute)) throw new NotFoundException('Fayl topilmadi');
    return { stream: createReadStream(absolute), absolutePath: absolute };
  }

  assertContentType(contentType: string): void {
    if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(contentType)) {
      throw new BadRequestException(
        `Ruxsat etilmagan MIME turi: ${contentType}. Ruxsat: ${ALLOWED_UPLOAD_MIME.join(', ')}`,
      );
    }
  }

  assertSize(bytes: number): void {
    if (bytes <= 0) throw new BadRequestException("Fayl bo'sh");
    if (bytes > this.maxBytes) {
      throw new BadRequestException(
        `Fayl hajmi ${this.config.getOrThrow<number>('uploads.maxMb')} MB dan oshmasligi kerak`,
      );
    }
  }

  /** Unique kalit — original nomdan xavfsiz qism + UUID. */
  buildObjectKey(originalName: string, contentType: string): string {
    const safe = sanitizeFilename(originalName);
    const ext = extname(safe) || MIME_EXTENSION[contentType] || '';
    const stem = ext ? safe.slice(0, -ext.length) : safe;
    return `${stem || 'file'}-${randomUUID()}${ext}`;
  }

  private resolveSafePath(key: string): string {
    const normalizedKey = normalize(key).replace(/^([/\\])+/, '').replace(/\0/g, '');
    if (
      normalizedKey.includes('..') ||
      normalizedKey.split(/[/\\]/).some((part) => part === '..')
    ) {
      throw new BadRequestException("Fayl yo'li noto'g'ri");
    }
    const absolute = resolve(this.uploadDir, normalizedKey);
    const root = this.uploadDir.endsWith(sep) ? this.uploadDir : `${this.uploadDir}${sep}`;
    if (absolute !== this.uploadDir && !absolute.startsWith(root)) {
      throw new BadRequestException("Fayl yo'li ruxsat etilmagan");
    }
    return absolute;
  }
}

@Injectable()
export class StorageService implements StorageDriver {
  constructor(private readonly driver: LocalStorageDriver) {}

  putObject(input: PutObjectInput): Promise<PutObjectResult> {
    return this.driver.putObject(input);
  }

  deleteObject(key: string): Promise<void> {
    return this.driver.deleteObject(key);
  }

  getSignedUrl(key: string, expiresSec?: number): Promise<string> {
    return this.driver.getSignedUrl(key, expiresSec);
  }

  openReadStream(key: string) {
    return this.driver.openReadStream(key);
  }

  assertContentType(contentType: string): void {
    this.driver.assertContentType(contentType);
  }

  assertSize(bytes: number): void {
    this.driver.assertSize(bytes);
  }

  buildObjectKey(originalName: string, contentType: string): string {
    return this.driver.buildObjectKey(originalName, contentType);
  }
}
