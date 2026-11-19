import { VersioningType } from '@nestjs/common';
import type { NestNodeApplication } from '@nestjs/platform-node';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiExceptionFilter } from './common/errors/api-exception.filter.js';
import { AppConfig } from './common/config/app-config.js';
import { setupSwagger } from './swagger.js';

export const API_PREFIX = 'api';

export function configureApp(app: NestNodeApplication, docs: boolean) {
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(helmet());
  app.use(
    (
      _request: unknown,
      response: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      response.setHeader('X-Request-Id', randomUUID());
      next();
    },
  );
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

  const config = app.get(AppConfig);
  if (docs && config.get('NODE_ENV', { infer: true }) !== 'production') {
    setupSwagger(app);
  }
}
