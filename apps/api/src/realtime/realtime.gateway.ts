import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import type { AuthTokenPayload } from '@bogcha/shared';
import type { Server, Socket } from 'socket.io';
import { IsNull, Repository } from 'typeorm';
import { Branch } from '../entities/branch.entity';
import { User } from '../entities/user.entity';

export const RealtimeEvent = {
  ATTENDANCE_UPDATED: 'attendance:updated',
  DASHBOARD_UPDATED: 'dashboard:updated',
  STOCK_UPDATED: 'stock:updated',
  EXPENSE_CREATED: 'expense:created',
  PAYMENT_CREATED: 'payment:created',
  NUTRITION_CLOSED: 'nutrition:closed',
  NOTIFICATION_CREATED: 'notification:created',
} as const;
export type RealtimeEvent = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

/**
 * Real-time kanal. Xonalar tenant va filial bo'yicha ajratilgan, shuning uchun
 * bir tashkilot boshqasining hodisalarini olmaydi (TZ §39, §42).
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
  ) {}

  /**
   * Token qo'l berish (handshake) bosqichida tekshiriladi — yaroqsiz ulanish
   * umuman o'rnatilmaydi va server resursini egallamaydi.
   */
  afterInit(server: Server): void {
    server.use((socket, next) => {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        next(new Error('unauthorized'));
        return;
      }

      this.jwtService
        .verifyAsync<AuthTokenPayload>(token, {
          secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        })
        .then(async (payload) => {
          const user = await this.users.findOne({
            where: { id: payload.sub, deletedAt: IsNull(), isActive: true },
            select: { id: true, tokenVersion: true },
          });
          if (!user || user.tokenVersion !== payload.tokenVersion) {
            next(new Error('unauthorized'));
            return;
          }
          socket.data.auth = payload;
          next();
        })
        .catch(() => next(new Error('unauthorized')));
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const payload = client.data.auth as AuthTokenPayload | undefined;
    if (!payload) {
      client.disconnect(true);
      return;
    }

    if (payload.tenantId) await client.join(tenantRoom(payload.tenantId));

    // Bo'sh branchIds — tenantdagi barcha faol filiallarga ruxsat (Owner/Admin).
    if (payload.branchIds.length === 0 && payload.tenantId) {
      const branches = await this.branches.find({
        where: { tenantId: payload.tenantId, deletedAt: IsNull(), isActive: true },
        select: { id: true },
      });
      for (const branch of branches) await client.join(branchRoom(branch.id));
    } else {
      for (const branchId of payload.branchIds) await client.join(branchRoom(branchId));
    }

    await client.join(userRoom(payload.sub));

    client.data.userId = payload.sub;
    client.data.tenantId = payload.tenantId;
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Uzildi: ${client.id}`);
  }

  emitToTenant(tenantId: string, event: RealtimeEvent, payload: unknown): void {
    this.server?.to(tenantRoom(tenantId)).emit(event, payload);
  }

  emitToBranch(branchId: string, event: RealtimeEvent, payload: unknown): void {
    this.server?.to(branchRoom(branchId)).emit(event, payload);
  }

  emitToUser(userId: string, event: RealtimeEvent, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }
}

const tenantRoom = (tenantId: string) => `tenant:${tenantId}`;
const branchRoom = (branchId: string) => `branch:${branchId}`;
const userRoom = (userId: string) => `user:${userId}`;
