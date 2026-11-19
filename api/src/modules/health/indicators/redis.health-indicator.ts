import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { RedisService } from '../../../database/redis/redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redis: RedisService,
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  /** Без REDIS_URL индикатор не участвует в readiness. */
  get enabled() {
    return this.redis.isConfigured;
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicator.check(key);
    try {
      const reply = await this.redis.client?.ping();
      return reply === 'PONG' ? indicator.up() : indicator.down();
    } catch {
      return indicator.down();
    }
  }
}
