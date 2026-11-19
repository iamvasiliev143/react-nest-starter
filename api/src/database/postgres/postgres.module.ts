import { Module } from '@nestjs/common';
import { PostgresService } from './postgres.service.js';
import { UserRepository } from './repositories/user.repository.js';

const repositories = [UserRepository];

@Module({
  providers: [PostgresService, ...repositories],
  exports: [PostgresService, ...repositories],
})
export class PostgresModule {}
