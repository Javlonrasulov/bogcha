import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceBatch } from '../entities/attendance-batch.entity';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import { Group } from '../entities/group.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceBatch, AttendanceRecord, Group, Child, Branch]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
