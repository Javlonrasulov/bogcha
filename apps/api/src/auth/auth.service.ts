import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import {
  Locale,
  permissionsForRoles,
  type AuthSession,
  type AuthTokenPayload,
  type AuthenticatedUser,
  type ChangePasswordInput,
  type LoginInput,
  type Role,
} from '@bogcha/shared';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { RequestScope } from '../common/scope/request-scope';
import { AuditAction, TenantStatus } from '../entities/enums';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from './password.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

type UserWithScope = User & {
  branches: { branchId: string }[];
  groups: { groupId: string }[];
  tenant: { id: string; status: TenantStatus; name: string } | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthSession> {
    const identifier = input.identifier.trim();
    const user = await this.findUserWithScopeByIdentifier(identifier);

    if (!user) throw new UnauthorizedException('Login yoki parol xato');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(
        `Akkaunt vaqtincha bloklangan. ${minutes} daqiqadan so'ng qayta urinib ko'ring.`,
      );
    }

    const isValid = await this.passwordService.verify(user.passwordHash, input.password);
    if (!isValid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException('Login yoki parol xato');
    }

    if (!user.isActive) throw new ForbiddenException('Akkaunt faol emas');
    if (user.tenant && user.tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException(
        "Tashkilot faol emas. Iltimos, platforma administratori bilan bog'laning.",
      );
    }

    await this.users.update(
      { id: user.id },
      { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    );
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();

    const session = await this.issueSession(user, meta);

    await this.auditService.record(this.scopeOf(user), {
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      summary: `${user.fullName} tizimga kirdi`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return session;
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthSession> {
    let payload: AuthTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AuthTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException("Refresh token yaroqsiz yoki muddati tugagan");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      if (stored?.revokedAt) await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }

    const user = await this.findUserWithScopeById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException("Sessiya bekor qilingan, qaytadan kiring");
    }

    await this.refreshTokens.update({ id: stored.id }, { revokedAt: new Date() });

    return this.issueSession(user, meta);
  }

  async logout(refreshToken: string | undefined, scope: RequestScope): Promise<{ success: true }> {
    if (refreshToken) {
      await this.refreshTokens
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: new Date() })
        .where('tokenHash = :tokenHash', { tokenHash: hashToken(refreshToken) })
        .andWhere('revokedAt IS NULL')
        .execute();
    }

    await this.auditService.record(scope, {
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: scope.userId,
      summary: 'Tizimdan chiqdi',
    });

    return { success: true };
  }

  async logoutAll(scope: RequestScope): Promise<{ success: true }> {
    await this.revokeAllForUser(scope.userId);
    return { success: true };
  }

  async me(scope: RequestScope): Promise<AuthenticatedUser> {
    const user = await this.findUserWithScopeById(scope.userId);
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
    return this.toAuthenticatedUser(user);
  }

  async changePassword(scope: RequestScope, input: ChangePasswordInput): Promise<{ success: true }> {
    const user = await this.users.findOne({
      where: { id: scope.userId, deletedAt: IsNull() },
    });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    const isValid = await this.passwordService.verify(user.passwordHash, input.currentPassword);
    if (!isValid) throw new UnauthorizedException('Joriy parol xato');

    const passwordHash = await this.passwordService.hash(input.newPassword);

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).increment({ id: user.id }, 'tokenVersion', 1);
      await manager.getRepository(User).update(
        { id: user.id },
        { passwordHash, mustChangePassword: false },
      );
      await manager
        .getRepository(RefreshToken)
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: new Date() })
        .where('userId = :userId', { userId: user.id })
        .andWhere('revokedAt IS NULL')
        .execute();
    });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: user.id,
      summary: "Parol o'zgartirildi",
    });

    return { success: true };
  }

  private async issueSession(user: UserWithScope, meta: RequestMeta): Promise<AuthSession> {
    const payload: AuthTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      roles: user.roles as Role[],
      branchIds: user.branches.map((item) => item.branchId),
      groupIds: user.groups.map((item) => item.groupId),
      tokenVersion: user.tokenVersion,
    };

    const accessTtl = this.configService.getOrThrow<string>('jwt.accessTtl');
    const refreshTtl = this.configService.getOrThrow<string>('jwt.refreshTtl');
    const accessTtlSeconds = Math.floor(parseDuration(accessTtl) / 1000);
    const refreshTtlSeconds = Math.floor(parseDuration(refreshTtl) / 1000);

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: accessTtlSeconds,
    });

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti: randomBytes(16).toString('hex') },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshTtlSeconds,
      },
    );

    await this.refreshTokens.save(
      this.refreshTokens.create({
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        deviceId: meta.deviceId ?? null,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtlSeconds,
      user: this.toAuthenticatedUser(user),
    };
  }

  private toAuthenticatedUser(user: UserWithScope): AuthenticatedUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles: user.roles as Role[],
      permissions: permissionsForRoles(user.roles as Role[]),
      branchIds: user.branches.map((item) => item.branchId),
      groupIds: user.groups.map((item) => item.groupId),
      locale: (user.locale as Locale) ?? Locale.UZ_LATN,
      avatarUrl: user.avatarUrl,
    };
  }

  private scopeOf(user: UserWithScope): RequestScope {
    return {
      userId: user.id,
      tenantId: user.tenantId,
      roles: user.roles as Role[],
      permissions: permissionsForRoles(user.roles as Role[]),
      branchIds: user.branches.map((item) => item.branchId),
      groupIds: user.groups.map((item) => item.groupId),
    };
  }

  private async registerFailedAttempt(user: { id: string; failedLoginCount: number }): Promise<void> {
    const attempts = user.failedLoginCount + 1;
    await this.users.update(
      { id: user.id },
      {
        failedLoginCount: attempts,
        lockedUntil:
          attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    );

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      this.logger.warn(`Akkaunt bloklandi (ko'p muvaffaqiyatsiz urinish): ${user.id}`);
    }
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).increment({ id: userId }, 'tokenVersion', 1);
      await manager
        .getRepository(RefreshToken)
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: new Date() })
        .where('userId = :userId', { userId })
        .andWhere('revokedAt IS NULL')
        .execute();
    });
  }

  private async findUserWithScopeByIdentifier(identifier: string): Promise<UserWithScope | null> {
    const user = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.branches', 'branches')
      .leftJoinAndSelect('user.groups', 'groups')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('user.deletedAt IS NULL')
      .andWhere('(user.email = :identifier OR user.phone = :identifier)', { identifier })
      .getOne();

    return user as UserWithScope | null;
  }

  private async findUserWithScopeById(id: string): Promise<UserWithScope | null> {
    const user = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.branches', 'branches')
      .leftJoinAndSelect('user.groups', 'groups')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    return user as UserWithScope | null;
  }
}

/** Refresh tokenning o'zi saqlanmaydi — faqat SHA-256 hash. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** `15m`, `30d`, `12h` kabi qiymatlarni millisekundga aylantiradi. */
export function parseDuration(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) return Number(value) || 0;

  const amount = Number(match[1]);
  const unit = match[2];
  const factors: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (factors[unit ?? 'ms'] ?? 1);
}
