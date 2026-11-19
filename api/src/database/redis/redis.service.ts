import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfig } from '../../common/config/app-config.js';

const TIMEOUT_MS = 3000;

/** Клиент Redis. Соединение открывается при первой команде. */
@Injectable()
export class RedisService implements OnApplicationShutdown {
  readonly client: Redis;

  constructor(config: AppConfig) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      connectTimeout: TIMEOUT_MS,
      commandTimeout: TIMEOUT_MS,
      maxRetriesPerRequest: 1,
    });
    // Ошибки соединения видит readiness; без обработчика ioredis
    // пишет каждую попытку переподключения как необработанную ошибку.
    this.client.on('error', () => {});
  }

  async onApplicationShutdown() {
    this.client.disconnect();
  }
}
