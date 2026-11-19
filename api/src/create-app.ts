import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { configureApp } from './app-setup.js';
import { AppModule } from './app.module.js';
import { AppConfig } from './common/config/app-config.js';
import { ObserveInstrument } from './common/observe.js';
import { RedisIoAdapter } from './common/realtime/redis-io.adapter.js';
import { RedisService } from './database/redis/redis.service.js';

export async function createApp({ docs = true } = {}) {
  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter(),
    {
      instrument: ObserveInstrument,
      logger: new ConsoleLogger({
        json: process.env.NODE_ENV === 'production',
      }),
    },
  );
  const config = app.get(AppConfig);
  const redis = app.get(RedisService);
  app.useWebSocketAdapter(
    new RedisIoAdapter(
      app,
      redis.client,
      config.get('REALTIME_CHANNEL', { infer: true }),
    ),
  );
  configureApp(app, docs);
  return app;
}
