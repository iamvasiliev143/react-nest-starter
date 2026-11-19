import 'reflect-metadata';
import { ConsoleLogger, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AppConfig } from './common/config/app-config.js';
import { ObserveInstrument } from './common/observe.js';

export function createOpenApiDocument(app: INestApplication) {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Starter API')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
}

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
  app.setGlobalPrefix('api');
  app.use(helmet());
  const config = app.get(AppConfig);
  if (docs && config.get('NODE_ENV', { infer: true }) !== 'production') {
    SwaggerModule.setup('api/docs', app, createOpenApiDocument(app), {
      jsonDocumentUrl: '/api/openapi.json',
    });
  }
  return app;
}
