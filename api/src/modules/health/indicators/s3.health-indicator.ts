import { Injectable } from '@nestjs/common';
import { Storage } from '@nestjs/storage';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';

@Injectable()
export class S3HealthIndicator {
  constructor(
    private readonly storage: Storage,
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicator.check(key);
    try {
      await this.storage
        .disk()
        .list({ limit: 1, signal: AbortSignal.timeout(3000) });
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}
