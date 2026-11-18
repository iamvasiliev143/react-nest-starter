import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { TelegramAuthController } from './telegram-auth.controller.js';
import { TelegramBearer } from './telegram-bearer.provider.js';
import { TelegramUsersService } from './telegram-users.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [TelegramAuthController],
  providers: [TelegramBearer, TelegramUsersService],
})
export class TelegramAuthModule {}
