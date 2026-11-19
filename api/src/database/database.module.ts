import { Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfig } from '../common/config/app-config.js';
import * as schema from './schema.js';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool?: Pool;
  readonly db?: ReturnType<typeof drizzle<typeof schema>>;

  constructor(config: AppConfig) {
    const connectionString = config.get('DATABASE_URL', { infer: true });
    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 3000,
        query_timeout: 3000,
      });
      this.db = drizzle(this.pool, { schema });
    }
  }

  get isConfigured() {
    return this.pool !== undefined;
  }

  async isReady(): Promise<boolean> {
    if (!this.pool) return true;
    try {
      await this.pool.query('select 1');
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown() {
    await this.pool?.end();
  }
}

@Module({ providers: [DatabaseService], exports: [DatabaseService] })
export class DatabaseModule {}
