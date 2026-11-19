import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '../../database/redis/redis.module.js';
import { RedisService } from '../../database/redis/redis.service.js';
import { AppConfig } from '../config/app-config.js';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

/** Лимиты запросов: счётчики в Redis общие для всех экземпляров API. */
export const AppThrottlerModule = ThrottlerModule.forRootAsync({
  imports: [RedisModule],
  inject: [RedisService, AppConfig],
  useFactory: (redis: RedisService, config: AppConfig) => ({
    throttlers: [{ ttl: 60_000, limit: 120 }],
    storage: new RedisThrottlerStorage(
      redis.client,
      config.get('THROTTLER_KEY_PREFIX', { infer: true }),
    ),
  }),
});
