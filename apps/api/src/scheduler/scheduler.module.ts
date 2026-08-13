import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from '../dashboard/dashboard.module';
import { Branch } from '../entities/branch.entity';
import { AnomalyScheduler } from './anomaly.scheduler';

@Module({
  imports: [DashboardModule, TypeOrmModule.forFeature([Branch])],
  providers: [AnomalyScheduler],
  exports: [AnomalyScheduler],
})
export class SchedulerModule {}
