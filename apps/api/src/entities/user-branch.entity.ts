/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Branch } from './branch.entity';
import { User } from './user.entity';

@Entity('UserBranch')
export class UserBranch {
  @PrimaryColumn('uuid')
  userId!: string;

  @PrimaryColumn('uuid')
  branchId!: string;

  @ManyToOne(() => User, (related) => related.branches, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Branch, (related) => related.userBranches, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;
}
