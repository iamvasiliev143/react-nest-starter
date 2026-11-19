import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '../../database/redis/redis.module.js';
import { RedisService } from '../../database/redis/redis.service.js';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

/**
 * Лимиты запросов. С REDIS_URL счётчики общие для всех экземпляров API,
 * без него — встроенное хранилище в памяти процесса.
 */
export const AppThrottlerModule = ThrottlerModule.forRootAsync({
  imports: [RedisModule],
  inject: [RedisService],
  useFactory: (redis: RedisService) => ({
    throttlers: [{ ttl: 60_000, limit: 120 }],
    ...(redis.client
      ? { storage: new RedisThrottlerStorage(redis.client) }
      : {}),
  }),
});
