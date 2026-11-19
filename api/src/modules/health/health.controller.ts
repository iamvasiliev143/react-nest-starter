import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { DatabaseService } from '../../database/database.module.js';
import { RedisService } from '../../database/redis.module.js';
import { HealthStatus } from './health.dto.js';

@Public()
@ApiTags('Status')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly healthCheck: HealthCheckService,
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  @Get()
  // operationId закреплены, чтобы не менять опубликованный контракт.
  @ApiOperation({ operationId: 'StatusController_health', summary: undefined })
  @ApiOkResponse({ type: HealthStatus })
  liveness(): HealthStatus {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({
    operationId: 'StatusController_readiness',
    summary: undefined,
  })
  @HealthCheck()
  readiness() {
    const checks = [];
    if (this.database.isConfigured)
      checks.push(() => this.check('postgres', this.database.isReady()));
    if (this.redis.isConfigured)
      checks.push(() => this.check('redis', this.redis.isReady()));
    return this.healthCheck.check(checks);
  }

  private async check(key: string, ready: Promise<boolean>) {
    const indicator = this.healthIndicator.check(key);
    return (await ready) ? indicator.up() : indicator.down();
  }
}
