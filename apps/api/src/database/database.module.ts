import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities';
import { UuidSubscriber } from './uuid.subscriber';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        url: config.getOrThrow<string>('databaseUrl'),
        entities: [...ALL_ENTITIES],
        subscribers: [UuidSubscriber],
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : false,
      }),
    }),
    TypeOrmModule.forFeature([...ALL_ENTITIES]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
