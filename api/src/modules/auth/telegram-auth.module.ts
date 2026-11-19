import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { TelegramAuthController } from './telegram-auth.controller.js';
import { TelegramBearer } from './telegram-bearer.provider.js';
import { TelegramSignInEnabledInterceptor } from './telegram-sign-in-enabled.interceptor.js';

@Module({
  imports: [UsersModule],
  controllers: [TelegramAuthController],
  providers: [TelegramBearer, TelegramSignInEnabledInterceptor],
})
export class TelegramAuthModule {}
