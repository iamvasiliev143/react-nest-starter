import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfig } from '../../common/config/app-config.js';
import * as schema from './schema/index.js';

const TIMEOUT_MS = 3000;

/** Подключение к PostgreSQL. Пул открывает соединения по мере запросов. */
@Injectable()
export class PostgresService implements OnApplicationShutdown {
  private readonly pool: Pool;
  readonly db: ReturnType<typeof drizzle<typeof schema>>;

  constructor(config: AppConfig) {
    this.pool = new Pool({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      connectionTimeoutMillis: TIMEOUT_MS,
      query_timeout: TIMEOUT_MS,
    });
    // Без обработчика ошибка простаивающего соединения роняет процесс.
    this.pool.on('error', () => {});
    this.db = drizzle(this.pool, { schema });
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
