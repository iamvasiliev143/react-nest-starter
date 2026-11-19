import { Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfig } from '../common/config/app-config.js';

const TIMEOUT_MS = 3000;

/** Клиент Redis. Без REDIS_URL клиент не создаётся. */
@Injectable()
export class RedisService implements OnApplicationShutdown {
  readonly client?: Redis;

  constructor(config: AppConfig) {
    const url = config.get('REDIS_URL', { infer: true });
    if (url) {
      this.client = new Redis(url, {
        lazyConnect: true,
        connectTimeout: TIMEOUT_MS,
        commandTimeout: TIMEOUT_MS,
        maxRetriesPerRequest: 1,
      });
      // Ошибки соединения видит readiness; без обработчика ioredis
      // пишет каждую попытку переподключения как необработанную ошибку.
      this.client.on('error', () => {});
    }
  }

  get isConfigured() {
    return this.client !== undefined;
  }

  async isReady(): Promise<boolean> {
    if (!this.client) return true;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onApplicationShutdown() {
    this.client?.disconnect();
  }
}

@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule {}
