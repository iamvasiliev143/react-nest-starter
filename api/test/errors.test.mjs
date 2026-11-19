import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { HTTP_ERROR_DTOS } from '../dist/common/errors/error-responses.js';
import { ApiExceptionFilter } from '../dist/common/errors/api-exception.filter.js';
import { ZodValidationPipe } from '../dist/common/zod-validation.pipe.js';
import { clientErrorSchema } from '../dist/modules/client-errors/dto/client-error.request.dto.js';

function render(exception, url = '/api/v1/example') {
  const headers = new Map();
  let result;
  const response = { getHeader: (name) => headers.get(name) };
  const filter = new ApiExceptionFilter({
    httpAdapter: {
      isHeadersSent: () => false,
      setHeader: (_res, name, value) => headers.set(name, value),
      reply: (_res, body, status) => {
        result = { body, status };
      },
    },
  });
  filter.catch(exception, {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => response,
    }),
  });
  return { ...result, headers };
}
test('unexpected errors hide internal data and carry a request ID', () => {
  const { body, status, headers } = render(
    new Error('postgres password=secret'),
  );
  assert.equal(status, 500);
  assert.equal(body.code, 'INTERNAL_ERROR');
  assert.equal(body.requestId, headers.get('X-Request-Id'));
  assert.match(body.requestId, /^[0-9a-f-]{36}$/);
  assert.ok(!JSON.stringify(body).includes('password'));
});
test('authentication and health keep statuses and readiness details', () => {
  const auth = render(new UnauthorizedException('sensitive credentials'));
  assert.equal(auth.status, 401);
  assert.equal(auth.body.code, 'UNAUTHORIZED');
  assert.ok(!JSON.stringify(auth.body).includes('sensitive'));
  const details = { redis: { status: 'down' } };
  const health = render(
    new ServiceUnavailableException({
      status: 'error',
      error: details,
      details,
    }),
    '/api/health/ready',
  );
  assert.equal(health.status, 503);
  assert.deepEqual(health.body.error, details);
  assert.deepEqual(health.body.details, details);
});
test('validation reports safe field paths and preserves custom exceptions', () => {
  const pipe = new ZodValidationPipe(z.object({ email: z.email() }));
  let failure;
  try {
    pipe.transform({ email: 'secret-invalid-input' });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof BadRequestException);
  const { body } = render(failure);
  assert.deepEqual(body.fieldErrors, [
    { path: 'email', message: 'Invalid value' },
  ]);
  assert.ok(!JSON.stringify(body).includes('secret-invalid-input'));
  const custom = new ZodValidationPipe(
    z.string(),
    () => new UnauthorizedException(),
  );
  assert.throws(() => custom.transform(42), UnauthorizedException);
});
test('frontend reports accept only bounded allowlisted metadata', () => {
  assert.equal(
    clientErrorSchema.safeParse({
      source: 'render',
      kind: 'Error',
      page: 'home',
    }).success,
    true,
  );
  for (const body of [
    { source: 'render', kind: 'Error', page: 'home', message: 'token=secret' },
    {
      source: 'render',
      kind: 'Error',
      page: 'https://example.com?token=secret',
    },
    { source: 'arbitrary', kind: 'Error', page: 'home' },
  ])
    assert.equal(clientErrorSchema.safeParse(body).success, false);
});

test('global error DTOs agree with runtime responses and OpenAPI', () => {
  const spec = JSON.parse(
    readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'),
  );
  assert.equal(spec.paths['/api/greeting'], undefined);
  assert.equal(spec.paths['/api/auth/telegram'], undefined);
  for (const [status, ErrorDto] of Object.entries(HTTP_ERROR_DTOS)) {
    const dto = new ErrorDto();
    const response = render(
      new HttpException('Private implementation detail', Number(status)),
    );
    assert.equal(response.status, dto.statusCode);
    assert.equal(response.body.code, dto.code);
    assert.equal(response.body.message, dto.message);
    const schema = spec.components.schemas[ErrorDto.name];
    assert.deepEqual(schema.properties.statusCode.enum, [Number(status)]);
    assert.deepEqual(schema.properties.code.enum, [dto.code]);
    assert.equal(schema.properties.message.type, 'string');
    assert.equal(schema.properties.statusCode.type, 'number');
    assert.ok(schema.required.includes('requestId'));
    assert.equal(
      Object.hasOwn(schema.properties, 'fieldErrors'),
      Number(status) === 400,
    );
    if (Number(status) !== 400)
      assert.equal(Object.hasOwn(response.body, 'fieldErrors'), false);
    assert.equal(
      spec.paths['/api/v1/greeting'].get.responses[status].content[
        'application/json'
      ].schema.$ref,
      '#/components/schemas/' + ErrorDto.name,
    );
  }
  const ready =
    spec.paths['/api/health/ready'].get.responses['503'].content[
      'application/json'
    ].schema;
  assert.ok(
    ready.allOf.some(
      (schema) =>
        schema.$ref ===
        '#/components/schemas/ServiceUnavailableErrorResponseDto',
    ),
  );
});
