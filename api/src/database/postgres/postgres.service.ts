import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfig } from '../../common/config/app-config.js';
import * as schema from './schema.js';

const TIMEOUT_MS = 3000;

/** Подключение к PostgreSQL. Без DATABASE_URL пул не создаётся. */
@Injectable()
export class PostgresService implements OnApplicationShutdown {
  private readonly pool?: Pool;
  readonly db?: ReturnType<typeof drizzle<typeof schema>>;

  constructor(config: AppConfig) {
    const connectionString = config.get('DATABASE_URL', { infer: true });
    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: TIMEOUT_MS,
        query_timeout: TIMEOUT_MS,
      });
      this.db = drizzle(this.pool, { schema });
    }
  }

  get isConfigured() {
    return this.pool !== undefined;
  }

  async onApplicationShutdown() {
    await this.pool?.end();
  }
}
