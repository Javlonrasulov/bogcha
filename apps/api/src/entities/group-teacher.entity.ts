/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from './user.entity';

@Entity('GroupTeacher')
export class GroupTeacher {
  @PrimaryColumn('uuid')
  groupId!: string;

  @PrimaryColumn('uuid')
  userId!: string;

  @ManyToOne(() => Group, (related) => related.teachers, { nullable: false })
  @JoinColumn({ name: 'groupId' })
  group!: Group;

  @ManyToOne(() => User, (related) => related.groups, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;
}
