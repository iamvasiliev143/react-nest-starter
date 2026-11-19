import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { configureApp } from './app-setup.js';
import { AppModule } from './app.module.js';
import { ObserveInstrument } from './common/observe.js';

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
  configureApp(app, docs);
  return app;
}
