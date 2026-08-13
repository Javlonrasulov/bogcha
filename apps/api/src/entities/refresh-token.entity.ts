/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('RefreshToken')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => Tenant, (related) => related.refreshTokens, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant | null;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (related) => related.refreshTokens, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'text', unique: true })
  tokenHash!: string;

  @Column({ type: 'text', nullable: true })
  deviceId!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'text', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
