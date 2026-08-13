import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../entities/branch.entity';
import { User } from '../entities/user.entity';
import { RealtimeGateway } from './realtime.gateway';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Branch])],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
