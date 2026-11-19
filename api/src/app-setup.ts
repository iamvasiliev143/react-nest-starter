import { VersioningType } from '@nestjs/common';
import type { NestNodeApplication } from '@nestjs/platform-node';
import helmet from 'helmet';
import { AppConfig } from './common/config/app-config.js';
import { setupSwagger } from './swagger.js';

export const API_PREFIX = 'api';

export function configureApp(app: NestNodeApplication, docs: boolean) {
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use(helmet());

  const config = app.get(AppConfig);
  if (docs && config.get('NODE_ENV', { infer: true }) !== 'production') {
    setupSwagger(app);
  }
}
