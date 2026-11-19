import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TelegramAuthController } from './telegram-auth.controller';
import { TelegramBearer } from './telegram-bearer.provider';
import { TelegramSignInEnabledInterceptor } from './telegram-sign-in-enabled.interceptor';

@Module({
  imports: [UsersModule],
  controllers: [TelegramAuthController],
  providers: [TelegramBearer, TelegramSignInEnabledInterceptor],
})
export class TelegramAuthModule {}
