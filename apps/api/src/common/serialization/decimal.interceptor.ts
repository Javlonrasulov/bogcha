import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { toNumber } from '../utils/decimal.util';

/**
 * Decimal va Date qiymatlarini JSON uchun oddiy turlarga aylantiradi.
 */
@Injectable()
export class DecimalSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((value) => normalize(value)));
  }
}

function normalize(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);

  if (typeof value === 'object') {
    if (Buffer.isBuffer(value)) return value;
    // TypeORM decimal transformer usually returns number; handle string decimals too.
    if (isDecimalLike(value)) return toNumber(value);
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = normalize(item);
    }
    return result;
  }

  return value;
}

function isDecimalLike(value: object): boolean {
  return 'toNumber' in value && typeof (value as { toNumber?: unknown }).toNumber === 'function';
}
