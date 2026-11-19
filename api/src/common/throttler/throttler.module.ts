import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '../../database/redis/redis.module.js';
import { RedisService } from '../../database/redis/redis.service.js';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

/** Лимиты запросов: счётчики в Redis общие для всех экземпляров API. */
export const AppThrottlerModule = ThrottlerModule.forRootAsync({
  imports: [RedisModule],
  inject: [RedisService],
  useFactory: (redis: RedisService) => ({
    throttlers: [{ ttl: 60_000, limit: 120 }],
    storage: new RedisThrottlerStorage(redis.client),
  }),
});
