import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { LocalStorageDriver, StorageService } from './storage.service';

@Module({
  controllers: [StorageController],
  providers: [LocalStorageDriver, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
