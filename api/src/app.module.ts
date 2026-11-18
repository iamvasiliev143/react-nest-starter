import { mkdir, realpath } from 'node:fs/promises';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationModule } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AcceptLanguageLocaleResolver,
  I18nModule,
  InMemoryI18nLoader,
} from '@nestjs/i18n';
import { LocalDisk, StorageModule } from '@nestjs/storage';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TelegramAuthModule } from './auth/telegram-auth.module.js';
import { validateEnvironment, type Environment } from './environment.js';
import { GreetingModule } from './greeting/greeting.module.js';
import { HealthModule } from './health/health.module.js';
import { translations } from './i18n.js';
import { ObserveModule } from './observe.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      skipProcessEnv: true,
      validate: validateEnvironment,
    }),
    ObserveModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => {
        const appKey = config.get('OBSERVE_APP_KEY', { infer: true }) ?? '';
        const appSecret =
          config.get('OBSERVE_APP_SECRET', { infer: true }) ?? '';
        return {
          appKey,
          appSecret,
          serviceId: 'starter-api',
          enabled: Boolean(appKey && appSecret),
          forwardLogs: true,
          http: { capture: false },
        };
      },
    }),
    I18nModule.forRoot({
      defaultLocale: 'en',
      supportedLocales: ['en', 'ru'],
      loader: new InMemoryI18nLoader(translations),
      resolvers: [new AcceptLanguageLocaleResolver()],
    }),
    StorageModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Environment, true>) => {
        const path = config.get('STORAGE_PATH', { infer: true });
        await mkdir(path, { recursive: true });
        return {
          disks: { local: new LocalDisk({ root: await realpath(path) }) },
        };
      },
    }),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => {
        const key = config.get('AUTH_TOKEN_SECRET', { infer: true });
        return key
          ? {
              refreshToken: false as const,
              accessToken: {
                key,
                issuer: 'starter-api',
                audience: 'telegram-mini-app',
                ttl: '15m',
              },
            }
          : {};
      },
    }),
    AuthorizationModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    HealthModule,
    GreetingModule,
    TelegramAuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
