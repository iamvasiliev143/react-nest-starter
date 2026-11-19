import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizationModule } from '@nestjs/authorization';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './common/config/app-config.module.js';
import { AppI18nModule } from './common/i18n.js';
import { AppObserveModule } from './common/observe.js';
import { AppThrottlerModule } from './common/throttler/throttler.module.js';
import { S3StorageModule } from './database/s3/s3.module.js';
import { AccessTokenModule } from './modules/auth/access-token.module.js';
import { TelegramAuthModule } from './modules/auth/telegram-auth.module.js';
import { GreetingModule } from './modules/greeting/greeting.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    AppConfigModule,
    AppObserveModule,
    AppI18nModule,
    S3StorageModule,
    AccessTokenModule,
    AuthorizationModule.forRoot(),
    AppThrottlerModule,
    HealthModule,
    GreetingModule,
    TelegramAuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
