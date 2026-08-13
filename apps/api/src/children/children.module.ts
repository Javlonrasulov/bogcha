import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import { Group } from '../entities/group.entity';
import { Guardian } from '../entities/guardian.entity';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Child,
      Guardian,
      Group,
      Branch,
      Invoice,
      Payment,
      AttendanceRecord,
    ]),
  ],
  controllers: [ChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
