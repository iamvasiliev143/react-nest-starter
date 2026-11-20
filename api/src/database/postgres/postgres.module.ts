import { Module } from '@nestjs/common';
import { PostgresService } from './postgres.service.js';
import { AppStatusRepository } from './repositories/app-status.repository.js';
import { UserRepository } from './repositories/user.repository.js';

const repositories = [AppStatusRepository, UserRepository];

@Module({
  providers: [PostgresService, ...repositories],
  exports: [PostgresService, ...repositories],
})
export class PostgresModule {}
