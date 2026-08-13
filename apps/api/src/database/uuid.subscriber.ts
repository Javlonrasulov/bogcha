import { randomUUID } from 'node:crypto';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';

/**
 * Prisma jadvallarida UUID PK uchun DB default yo'q edi.
 * TypeORM PrimaryGeneratedColumn DEFAULT ishlatadi — shu sababli insert oldidan id to'ldiriladi.
 */
@EventSubscriber()
export class UuidSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    if (!event.entity || !event.metadata) return;
    for (const column of event.metadata.primaryColumns) {
      const key = column.propertyName;
      if (
        (column.type === 'uuid' || column.type === 'uniqueidentifier') &&
        (event.entity[key] === undefined || event.entity[key] === null)
      ) {
        event.entity[key] = randomUUID();
      }
    }
  }
}
