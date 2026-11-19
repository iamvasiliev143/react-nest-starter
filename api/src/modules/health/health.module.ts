import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PostgresModule } from '../../database/postgres/postgres.module.js';
import { RedisModule } from '../../database/redis/redis.module.js';
import { HealthController } from './health.controller.js';
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator.js';
import { RedisHealthIndicator } from './indicators/redis.health-indicator.js';
import { S3HealthIndicator } from './indicators/s3.health-indicator.js';

@Module({
  imports: [PostgresModule, RedisModule, TerminusModule],
  controllers: [HealthController],
  providers: [PostgresHealthIndicator, RedisHealthIndicator, S3HealthIndicator],
})
export class HealthModule {}
