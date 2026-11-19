import { Module } from '@nestjs/common';
import { PostgresService } from './postgres.service.js';
import { UsersRepository } from './repositories/users.repository.js';

const repositories = [UsersRepository];

@Module({
  providers: [PostgresService, ...repositories],
  exports: [PostgresService, ...repositories],
})
export class PostgresModule {}
