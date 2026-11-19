import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizationModule } from '@nestjs/authorization';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './common/config/app-config.module.js';
import { AppI18nModule } from './common/i18n.js';
import { AppObserveModule } from './common/observe.js';
import { AppStorageModule } from './common/storage.js';
import { AccessTokenModule } from './modules/auth/access-token.module.js';
import { TelegramAuthModule } from './modules/auth/telegram-auth.module.js';
import { GreetingModule } from './modules/greeting/greeting.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    AppConfigModule,
    AppObserveModule,
    AppI18nModule,
    AppStorageModule,
    AccessTokenModule,
    AuthorizationModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    HealthModule,
    GreetingModule,
    TelegramAuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
