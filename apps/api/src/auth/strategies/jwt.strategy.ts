import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { permissionsForRoles, type AuthTokenPayload } from '@bogcha/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IsNull, Repository } from 'typeorm';
import type { RequestScope } from '../../common/scope/request-scope';
import { User } from '../../entities/user.entity';

export type JwtValidatedUser = RequestScope;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: AuthTokenPayload): Promise<JwtValidatedUser> {
    const user = await this.users.findOne({
      where: { id: payload.sub, deletedAt: IsNull(), isActive: true },
      select: { id: true, tokenVersion: true },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException("Sessiya bekor qilingan, qaytadan kiring");
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roles: payload.roles ?? [],
      permissions: permissionsForRoles(payload.roles ?? []),
      branchIds: payload.branchIds ?? [],
      groupIds: payload.groupIds ?? [],
    };
  }
}
