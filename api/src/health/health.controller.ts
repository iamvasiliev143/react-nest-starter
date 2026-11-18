import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { DatabaseService } from '../database/database.module.js';
import { HealthStatus } from './health.dto.js';

@Public()
@ApiTags('Status')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
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
    return this.healthCheck.check(
      this.database.isConfigured ? [() => this.checkPostgres()] : [],
    );
  }

  private async checkPostgres() {
    const indicator = this.healthIndicator.check('postgres');
    return (await this.database.isReady()) ? indicator.up() : indicator.down();
  }
}
