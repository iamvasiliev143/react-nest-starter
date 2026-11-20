import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { PostgresModule } from '../../database/postgres/postgres.module.js';
import { RedisModule } from '../../database/redis/redis.module.js';
import { AppStatusController } from './app-status.controller.js';
import { AppStatusService } from './app-status.service.js';
import { HealthController } from './health.controller.js';
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator.js';
import { RedisHealthIndicator } from './indicators/redis.health-indicator.js';
import { S3HealthIndicator } from './indicators/s3.health-indicator.js';
import { MaintenanceGuard } from './maintenance.guard.js';

@Module({
  imports: [PostgresModule, RedisModule, TerminusModule],
  controllers: [HealthController, AppStatusController],
  providers: [
    AppStatusService,
    PostgresHealthIndicator,
    RedisHealthIndicator,
    S3HealthIndicator,
    { provide: APP_GUARD, useClass: MaintenanceGuard },
  ],
})
export class HealthModule {}
