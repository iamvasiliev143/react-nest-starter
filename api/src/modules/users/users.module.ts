import { Module } from '@nestjs/common';
import { PostgresModule } from '../../database/postgres/postgres.module.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [PostgresModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
