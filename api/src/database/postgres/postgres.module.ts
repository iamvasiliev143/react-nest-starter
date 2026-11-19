import { Module } from '@nestjs/common';
import { PostgresService } from './postgres.service';
import { UsersRepository } from './repositories/users.repository';

const repositories = [UsersRepository];

@Module({
  providers: [PostgresService, ...repositories],
  exports: [PostgresService, ...repositories],
})
export class PostgresModule {}
