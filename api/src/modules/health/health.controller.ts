import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthStatus } from './dto/health-status.response.dto.js';
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator.js';
import { RedisHealthIndicator } from './indicators/redis.health-indicator.js';
import { S3HealthIndicator } from './indicators/s3.health-indicator.js';
import { AllowDuringMaintenance } from './maintenance.guard.js';

@Public()
@AllowDuringMaintenance(true)
@ApiTags('Status')
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly postgres: PostgresHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly s3: S3HealthIndicator,
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
    return this.healthCheck.check([
      () => this.postgres.check('postgres'),
      () => this.redis.check('redis'),
      () => this.s3.check('s3'),
    ]);
  }
}
