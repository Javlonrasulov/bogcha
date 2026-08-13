import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAnyPermission, type Permission } from '@bogcha/shared';
import { PERMISSIONS_KEY, type AuthenticatedRequest } from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const scope = request.scope;
    if (!scope) throw new ForbiddenException("Kontekst aniqlanmadi");

    if (!hasAnyPermission(scope.permissions, required)) {
      throw new ForbiddenException(
        `Bu amal uchun ruxsat yo'q. Kerakli huquqlardan biri: ${required.join(', ')}`,
      );
    }
    return true;
  }
}
