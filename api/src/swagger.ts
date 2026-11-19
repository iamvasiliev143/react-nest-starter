import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SWAGGER_TAGS } from './swagger-tags.js';

export const SWAGGER_UI_PATH = '/docs';

export function createOpenApiDocument(app: INestApplication) {
  const document = new DocumentBuilder()
    .setTitle('Starter API')
    .setVersion('1.0')
    .addBearerAuth();
  for (const [name, description] of SWAGGER_TAGS) {
    document.addTag(name, description);
  }
  return SwaggerModule.createDocument(app, document.build());
}

export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup(SWAGGER_UI_PATH, app, createOpenApiDocument(app), {
    useGlobalPrefix: true,
    jsonDocumentUrl: '/openapi.json',
  });
}
