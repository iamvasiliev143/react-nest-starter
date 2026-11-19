import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '../../database/database.module.js';
import { RedisModule } from '../../database/redis.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [DatabaseModule, RedisModule, TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
