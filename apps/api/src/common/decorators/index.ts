import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Permission } from '@bogcha/shared';
import type { Request } from 'express';
import type { RequestScope } from '../scope/request-scope';

export const IS_PUBLIC_KEY = 'bogcha:isPublic';
export const PERMISSIONS_KEY = 'bogcha:permissions';
export const AUDIT_KEY = 'bogcha:audit';

/** Autentifikatsiyasiz kirish mumkin bo'lgan endpoint. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Endpoint uchun kerakli huquqlar — biri yetarli (OR mantiqi). */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export interface AuditMetadata {
  entityType: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'EXPORT';
  /** Audit yozuvidagi qisqa izoh. */
  summary?: string;
}

/** Endpoint natijasini audit logga yozish (TZ §29). */
export const Audit = (metadata: AuditMetadata) => SetMetadata(AUDIT_KEY, metadata);

export interface AuthenticatedRequest extends Request {
  scope?: RequestScope;
  /** Korrelyatsiya uchun so'rov identifikatori (RequestLoggingInterceptor). */
  requestId?: string;
}

/** Kontroller metodiga so'rov kontekstini uzatadi. */
export const Scope = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.scope;
});
