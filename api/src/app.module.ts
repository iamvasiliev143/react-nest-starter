import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizationModule } from '@nestjs/authorization';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './common/config/app-config.module';
import { AppI18nModule } from './common/i18n';
import { AppObserveModule } from './common/observe';
import { AppStorageModule } from './common/storage';
import { AccessTokenModule } from './modules/auth/access-token.module';
import { TelegramAuthModule } from './modules/auth/telegram-auth.module';
import { GreetingModule } from './modules/greeting/greeting.module';
import { HealthModule } from './modules/health/health.module';

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
