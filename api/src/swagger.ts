import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './common/errors/dto/api-error.response.dto.js';
import { FieldErrorDto } from './common/errors/dto/field-error.dto.js';
import { HTTP_ERROR_DTOS } from './common/errors/error-responses.js';
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
  const spec = SwaggerModule.createDocument(app, document.build(), {
    extraModels: [
      ApiErrorResponseDto,
      FieldErrorDto,
      ...Object.values(HTTP_ERROR_DTOS),
    ],
    operationIdFactory(controller, methodKey, version) {
      return version
        ? controller + '_' + methodKey + '_' + version
        : controller + '_' + methodKey;
    },
  });
  for (const item of Object.values(spec.paths)) {
    for (const method of [
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'options',
      'head',
    ] as const) {
      const operation = item[method];
      if (!operation) continue;
      for (const [status, ErrorDto] of Object.entries(HTTP_ERROR_DTOS)) {
        const existing = operation.responses[status];
        if (existing && '$ref' in existing) continue;
        const schema = existing?.content?.['application/json']?.schema;
        operation.responses[status] = {
          ...existing,
          description: existing?.description ?? 'Request failed',
          content: {
            'application/json': {
              schema: schema
                ? {
                    allOf: [
                      schema,
                      { $ref: '#/components/schemas/' + ErrorDto.name },
                    ],
                  }
                : { $ref: '#/components/schemas/' + ErrorDto.name },
            },
          },
        };
      }
    }
  }
  return spec;
}

export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup(SWAGGER_UI_PATH, app, createOpenApiDocument(app), {
    useGlobalPrefix: true,
    jsonDocumentUrl: '/openapi.json',
  });
}
