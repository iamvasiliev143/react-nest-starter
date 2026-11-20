import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import type { ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { HTTP_ERROR_DTOS } from './error-responses.js';
import { ApiErrorResponseDto } from './dto/api-error.response.dto.js';
import { MaintenanceException } from './maintenance.exception.js';
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  constructor(private readonly adapters: HttpAdapterHost) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<ServerResponse>();
    const adapter = this.adapters.httpAdapter;
    if (adapter.isHeadersSent(response)) return;
    const requestId = String(
      response.getHeader('X-Request-Id') ?? randomUUID(),
    );
    adapter.setHeader(response, 'X-Request-Id', requestId);
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const ErrorDto =
      HTTP_ERROR_DTOS[statusCode] ??
      (statusCode >= 500 ? HTTP_ERROR_DTOS[500] : ApiErrorResponseDto);
    const maintenance = exception instanceof MaintenanceException;
    const { code, message } = maintenance
      ? { code: 'MAINTENANCE', message: 'Scheduled maintenance' }
      : new ErrorDto();
    const original =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body =
      typeof original === 'object' && original !== null
        ? (original as Record<string, unknown>)
        : {};
    // Preserve Terminus readiness fields for existing health-check consumers.
    const health =
      statusCode === 503 &&
      body.status === 'error' &&
      body.details !== undefined
        ? {
            status: body.status,
            info: body.info,
            error: body.error,
            details: body.details,
          }
        : {};
    if (statusCode >= 500 && !maintenance) {
      this.logger.error({ code, requestId, statusCode });
    }
    adapter.reply(
      response,
      {
        ...health,
        statusCode,
        code,
        message,
        requestId,
        ...(statusCode === 400 && Array.isArray(body.fieldErrors)
          ? { fieldErrors: body.fieldErrors }
          : {}),
      },
      statusCode,
    );
  }
}
