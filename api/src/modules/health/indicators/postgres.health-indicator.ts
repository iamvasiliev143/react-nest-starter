import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { PostgresService } from '../../../database/postgres/postgres.service.js';

@Injectable()
export class PostgresHealthIndicator {
  constructor(
    private readonly postgres: PostgresService,
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  /** Без DATABASE_URL индикатор не участвует в readiness. */
  get enabled() {
    return this.postgres.isConfigured;
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicator.check(key);
    try {
      await this.postgres.db?.execute(sql`select 1`);
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}
