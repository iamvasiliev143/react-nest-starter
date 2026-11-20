import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { TelegramBotMenuService } from './telegram-bot-menu.service.js';
import { TelegramBotUpdatesService } from './telegram-bot-updates.service.js';

@Module({
  imports: [UsersModule],
  providers: [TelegramBotMenuService, TelegramBotUpdatesService],
  exports: [TelegramBotMenuService, TelegramBotUpdatesService],
})
export class TelegramBotModule {}
